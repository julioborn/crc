// Envío físico de push (FCM). No decide QUIÉN recibe qué — eso ya lo
// resolvieron los triggers de la base (notificar_aviso, notificar_cuota_emitida,
// notificar_turno_estado, notificar_pago_acreditado) y el cron
// (generar_notificaciones_programadas), que insertan filas en
// `notificacion` con push_enviado=false. Esta función solo:
//   1. Lee lo pendiente.
//   2. Respeta preferencia_notificacion (salvo cuota_vencida, institucional).
//   3. Manda el push por FCM HTTP v1.
//   4. Borra los tokens que FCM marca como inválidos.
//   5. Marca push_enviado=true (se procesó, se haya mandado el push o no).
//
// La disparan: pg_cron cada 5 minutos (vía pg_net, con x-push-secret) y,
// potencialmente, cualquier otro caller que conozca el secreto — nunca un
// usuario final ni el cliente de la app.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PUSH_FUNCTION_SECRET = Deno.env.get("PUSH_FUNCTION_SECRET") ?? "";
const FIREBASE_SERVICE_ACCOUNT_JSON = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") ?? "";

type ServiceAccount = { client_email: string; private_key: string; project_id: string };

function base64UrlDeToBytes(b64: string): Uint8Array {
  const binary = atob(b64.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function jsonToBase64Url(obj: unknown): string {
  return btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** JWT firmado (RS256) con la service account, canjeado por un access
 * token de Google con scope de FCM — es el flujo estándar de OAuth2
 * server-to-server, sin ninguna librería de Firebase (no hay SDK de
 * Admin para Deno/Edge Runtime). */
async function obtenerAccessToken(cuenta: ServiceAccount): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: cuenta.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: ahora,
    exp: ahora + 3600,
  };
  const sinFirmar = `${jsonToBase64Url(header)}.${jsonToBase64Url(claim)}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    base64UrlDeToBytes(cuenta.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const firma = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(sinFirmar));
  const jwt = `${sinFirmar}.${bytesToBase64Url(new Uint8Array(firma))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`No se pudo obtener access token de Google: ${JSON.stringify(json)}`);
  return json.access_token as string;
}

async function enviarFcm(
  accessToken: string,
  projectId: string,
  token: string,
  payload: { titulo: string; cuerpo: string; deepLink: string | null },
): Promise<{ ok: boolean; tokenInvalido: boolean }> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: payload.titulo, body: payload.cuerpo },
        webpush: {
          notification: { icon: "/icon-512x512.png" },
          fcm_options: payload.deepLink ? { link: payload.deepLink } : undefined,
        },
        data: payload.deepLink ? { deep_link: payload.deepLink } : {},
      },
    }),
  });

  if (res.ok) return { ok: true, tokenInvalido: false };

  const body = await res.json().catch(() => ({}) as Record<string, unknown>);
  const status = (body as { error?: { status?: string } }).error?.status;
  console.error("push-send: FCM rechazó el envío", res.status, status, body);
  const tokenInvalido = status === "UNREGISTERED" || status === "NOT_FOUND" || status === "INVALID_ARGUMENT";
  return { ok: false, tokenInvalido };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  if (!PUSH_FUNCTION_SECRET || req.headers.get("x-push-secret") !== PUSH_FUNCTION_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.error("push-send: faltan variables de entorno");
    return new Response("not configured", { status: 500 });
  }

  const cuenta = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON) as ServiceAccount;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: pendientes, error } = await supabase
    .from("notificacion")
    .select("id, usuario_id, categoria, titulo, cuerpo, deep_link")
    .eq("push_enviado", false)
    .order("created_at")
    .limit(200);

  if (error) {
    console.error("push-send: no se pudo leer notificacion", error);
    return new Response("error interno", { status: 500 });
  }
  if (!pendientes || pendientes.length === 0) {
    return new Response(JSON.stringify({ procesadas: 0 }), { status: 200 });
  }

  const usuarioIds = [...new Set(pendientes.map((n) => n.usuario_id))];

  const [{ data: preferencias }, { data: dispositivos }] = await Promise.all([
    supabase.from("preferencia_notificacion").select("usuario_id, categoria, habilitada").in("usuario_id", usuarioIds),
    supabase.from("dispositivo").select("id, usuario_id, fcm_token").in("usuario_id", usuarioIds),
  ]);

  const prefMap = new Map((preferencias ?? []).map((p) => [`${p.usuario_id}:${p.categoria}`, p.habilitada]));
  const dispositivosPorUsuario = new Map<string, { id: string; fcm_token: string }[]>();
  for (const d of dispositivos ?? []) {
    const lista = dispositivosPorUsuario.get(d.usuario_id) ?? [];
    lista.push({ id: d.id, fcm_token: d.fcm_token });
    dispositivosPorUsuario.set(d.usuario_id, lista);
  }

  const accessToken = await obtenerAccessToken(cuenta);
  const tokensAEliminar = new Set<string>();
  let enviados = 0;

  for (const n of pendientes) {
    // cuota_vencida es institucional: se manda aunque el usuario haya
    // apagado la categoría.
    const habilitada = n.categoria === "cuota_vencida" ? true : (prefMap.get(`${n.usuario_id}:${n.categoria}`) ?? true);
    if (!habilitada) continue;

    for (const d of dispositivosPorUsuario.get(n.usuario_id) ?? []) {
      const resultado = await enviarFcm(accessToken, cuenta.project_id, d.fcm_token, {
        titulo: n.titulo,
        cuerpo: n.cuerpo,
        deepLink: n.deep_link,
      });
      if (resultado.ok) enviados++;
      if (resultado.tokenInvalido) tokensAEliminar.add(d.id);
    }
  }

  if (tokensAEliminar.size > 0) {
    await supabase.from("dispositivo").delete().in("id", [...tokensAEliminar]);
  }

  await supabase
    .from("notificacion")
    .update({ push_enviado: true })
    .in("id", pendientes.map((n) => n.id));

  return new Response(
    JSON.stringify({ procesadas: pendientes.length, enviados, tokens_eliminados: tokensAEliminar.size }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
