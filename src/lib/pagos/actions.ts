'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { crearPreferenciaMP } from './mercadopago';

export type PagoMPState = { error: string | null };

async function origin() {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host');
  return `${proto}://${host}`;
}

export async function iniciarPagoMercadoPago(
  _prevState: PagoMPState,
  formData: FormData,
): Promise<PagoMPState> {
  const cuotaId = String(formData.get('cuota_id') ?? '');
  if (!cuotaId) {
    return { error: 'Falta la cuota.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Iniciá sesión de nuevo.' };
  }

  // La RLS de "mis cuotas" ya filtra: si esto no es tuya (ni de tu grupo
  // familiar), simplemente no aparece.
  const { data: cuota, error: cuotaError } = await supabase
    .from('cuota')
    .select('id, tipo, periodo, monto, estado')
    .eq('id', cuotaId)
    .single();

  if (cuotaError || !cuota) {
    return { error: 'No se encontró la cuota.' };
  }
  if (cuota.estado !== 'impaga') {
    return { error: 'Esta cuota ya no está impaga.' };
  }

  let preferencia;
  try {
    preferencia = await crearPreferenciaMP({
      cuotaId: cuota.id,
      usuarioId: user.id,
      titulo: `Cuota ${cuota.tipo} — ${cuota.periodo}`,
      monto: cuota.monto,
      origin: await origin(),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo iniciar el pago.' };
  }

  // Recién acá, con la preferencia ya creada del lado de MP, pasamos la
  // cuota a pendiente. Si algo hubiera fallado arriba, la cuota sigue
  // impaga y el socio puede reintentar sin quedar en un estado raro.
  const { error: rpcError } = await supabase.rpc('iniciar_pago_cuota', {
    p_cuota_id: cuota.id,
  });
  if (rpcError) {
    return { error: rpcError.message };
  }

  redirect(preferencia.sandbox_init_point || preferencia.init_point);
}
