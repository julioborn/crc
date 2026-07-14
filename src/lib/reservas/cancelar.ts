'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type CancelarState = { error: string | null };

export async function cancelarTurno(
  _prevState: CancelarState,
  formData: FormData,
): Promise<CancelarState> {
  const turnoId = String(formData.get('turno_id') ?? '');
  if (!turnoId) {
    return { error: 'Falta el turno.' };
  }

  const supabase = await createClient();
  // trg_validar_cancelacion es quien de verdad decide esto (plazo,
  // estado, que sea tu turno). El mensaje que tira ya es legible — se
  // muestra tal cual, no hace falta traducirlo.
  const { error } = await supabase.from('turno').update({ estado: 'cancelado' }).eq('id', turnoId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/app/mis-turnos');
  return { error: null };
}
