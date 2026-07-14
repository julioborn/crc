// Webhook de Mercado Pago (Checkout Pro).
//
// MP manda esta notificación DOS VECES, siempre. La idempotencia va por
// el UNIQUE de pago.mp_payment_id: si el insert choca, ya se procesó
// antes — se responde 200 igual, sin reintentar ni loguear como error.
//
// Nunca se confía en el cuerpo del webhook para el monto/estado: siempre
// se vuelve a pedir el pago a la API de Mercado Pago con el access token,
// y el monto que se guarda sale de la propia cuota, no de MP.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") ?? "";
const MP_WEBHOOK_SECRET = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const firma = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(firma))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Algoritmo documentado por Mercado Pago: x-signature trae "ts=...,v1=...";
 * el manifiesto a firmar es "id:{dataId};request-id:{x-request-id};ts:{ts};"
 * y el HMAC-SHA256 de eso (con el secret del webhook) tiene que matchear v1.
 */
async function firmaValida(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
): Promise<boolean> {
  if (!MP_WEBHOOK_SECRET || !xSignature || !xRequestId || !dataId) return false;

  const partes: Record<string, string> = {};
  for (const par of xSignature.split(",")) {
    const [k, v] = par.split("=");
    if (k && v) partes[k.trim()] = v.trim();
  }

  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const esperado = await hmacSha256Hex(MP_WEBHOOK_SECRET, manifest);

  return esperado === v1;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  if (!MP_ACCESS_TOKEN || !MP_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("faltan variables de entorno del webhook de MP");
    return new Response("not configured", { status: 500 });
  }

  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const data = (body as { data?: { id?: string } }).data;

  const dataId = String(data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
  const type = String((body as { type?: string }).type ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "");

  // Otros topics (merchant_order, etc.) no nos interesan — se acusa
  // recibo igual para que MP no reintente.
  if (!dataId || type !== "payment") {
    return new Response("ok", { status: 200 });
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  if (!(await firmaValida(xSignature, xRequestId, dataId))) {
    console.error("firma inválida en webhook de MP", { dataId, xRequestId });
    return new Response("firma inválida", { status: 401 });
  }

  const pagoRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  });

  if (!pagoRes.ok) {
    console.error("no se pudo confirmar el pago con la API de MP", await pagoRes.text());
    return new Response("no se pudo confirmar el pago", { status: 502 });
  }

  const pago = await pagoRes.json();
  const [cuotaId, usuarioId] = String(pago.external_reference ?? "").split(":");

  if (!cuotaId || !usuarioId) {
    console.error("external_reference inválido", pago.external_reference);
    return new Response("ok", { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (pago.status === "approved") {
    const { data: cuota } = await supabase
      .from("cuota")
      .select("monto")
      .eq("id", cuotaId)
      .single();

    if (!cuota) {
      console.error("cuota no encontrada", cuotaId);
      return new Response("ok", { status: 200 });
    }

    const { error } = await supabase.from("pago").insert({
      cuota_id: cuotaId,
      metodo: "mercadopago",
      monto: cuota.monto,
      mp_payment_id: String(pago.id),
      mp_status: pago.status,
      registrado_por: usuarioId,
    });

    // 23505 = unique_violation en mp_payment_id: MP ya mandó este mismo
    // webhook antes. Se ignora sin error, tal cual pide el dominio.
    if (error && error.code !== "23505") {
      console.error("error insertando pago", error);
      return new Response("error interno", { status: 500 });
    }
  } else if (pago.status === "rejected" || pago.status === "cancelled") {
    // Solo revierte si sigue en pendiente — si por alguna carrera ya
    // quedó pagada por otro camino, no la toca.
    await supabase
      .from("cuota")
      .update({ estado: "impaga" })
      .eq("id", cuotaId)
      .eq("estado", "pendiente");
  }

  return new Response("ok", { status: 200 });
});
