'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type CobroState = { error: string | null };

const PATH = '/app/cobros';

export async function registrarCobroPresencial(
  _prevState: CobroState,
  formData: FormData,
): Promise<CobroState> {
  const cuotaId = String(formData.get('cuota_id') ?? '');
  const metodo = String(formData.get('metodo') ?? '');
  const comprobanteUrl = String(formData.get('comprobante_url') ?? '').trim() || null;
  const observaciones = String(formData.get('observaciones') ?? '').trim() || null;

  if (!cuotaId || (metodo !== 'efectivo' && metodo !== 'transferencia')) {
    return { error: 'Elegí una cuota y un método de pago válido.' };
  }

  const supabase = await createClient();

  // El monto SIEMPRE sale de la cuota, nunca de un input editable: es
  // plata, no hay margen para que alguien tipee un número distinto al que
  // ya está congelado.
  const { data: cuota } = await supabase
    .from('cuota')
    .select('monto, estado')
    .eq('id', cuotaId)
    .single();

  if (!cuota) {
    return { error: 'No se encontró la cuota.' };
  }
  if (cuota.estado !== 'impaga') {
    return { error: 'Esta cuota ya no está impaga.' };
  }

  // "registro pago de mi area" (puede_cobrar) es el gate real: si la cuota
  // es de un área que esta persona no gestiona (y no es CD), esto falla
  // solo. El trigger trg_pago_movimiento se encarga del resto.
  const { error } = await supabase.from('pago').insert({
    cuota_id: cuotaId,
    metodo,
    monto: cuota.monto,
    comprobante_url: comprobanteUrl,
    observaciones,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(PATH);
  return { error: null };
}
