'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type CobroTurnoState = { error: string | null };

const PATH = '/app/panel-turnos';

export async function aprobarTurno(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from('turno')
    .update({ estado: 'confirmado', aprobado_por: user?.id })
    .eq('id', id);

  revalidatePath(PATH);
}

export async function rechazarTurno(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from('turno')
    .update({ estado: 'rechazado', aprobado_por: user?.id })
    .eq('id', id);

  revalidatePath(PATH);
}

export async function marcarAusente(id: string) {
  const supabase = await createClient();
  await supabase.from('turno').update({ estado: 'ausente' }).eq('id', id);
  revalidatePath(PATH);
}

export async function cobrarTurno(
  _prevState: CobroTurnoState,
  formData: FormData,
): Promise<CobroTurnoState> {
  const turnoId = String(formData.get('turno_id') ?? '');
  const metodo = String(formData.get('metodo') ?? '');
  const comprobanteUrl = String(formData.get('comprobante_url') ?? '').trim() || null;

  if (!turnoId || (metodo !== 'efectivo' && metodo !== 'transferencia')) {
    return { error: 'Elegí un método de pago válido.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El monto sale del turno (ya congelado al reservar), nunca de un input.
  const { data: turno } = await supabase.from('turno').select('precio').eq('id', turnoId).single();
  if (!turno) {
    return { error: 'No se encontró el turno.' };
  }

  // "registro pago de mi area" (puede_cobrar) es el gate real.
  const { error } = await supabase.from('pago').insert({
    turno_id: turnoId,
    metodo,
    monto: turno.precio,
    comprobante_url: comprobanteUrl,
  });

  if (error) {
    return { error: error.message };
  }

  // El trigger ya puso cobrado=true y cobrado_at — acá solo falta
  // registrar quién lo cobró, columna que el trigger no toca.
  await supabase.from('turno').update({ cobrado_por: user?.id }).eq('id', turnoId);

  revalidatePath(PATH);
  return { error: null };
}
