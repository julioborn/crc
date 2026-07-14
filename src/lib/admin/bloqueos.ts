'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { datetimeLocalAUtc } from '@/lib/reservas/tz';

export type BloqueoState = { error: string | null };

const PATH = '/app/recursos';

export async function crearBloqueo(
  recursoId: string,
  _prevState: BloqueoState,
  formData: FormData,
): Promise<BloqueoState> {
  const desde = String(formData.get('desde') ?? '');
  const hasta = String(formData.get('hasta') ?? '');
  const motivo = String(formData.get('motivo') ?? '').trim() || null;

  if (!desde || !hasta) {
    return { error: 'Elegí desde y hasta.' };
  }
  if (hasta <= desde) {
    return { error: 'El "hasta" tiene que ser posterior al "desde".' };
  }

  const supabase = await createClient();
  // El <input type="datetime-local"> no lleva zona horaria — lo que el
  // admin tipeó es hora del club, no UTC. Antes esto se guardaba tal
  // cual, y la base (que interpreta timestamps sin offset como UTC) lo
  // corría 3 horas.
  const { error } = await supabase.from('bloqueo').insert({
    recurso_id: recursoId,
    desde: datetimeLocalAUtc(desde),
    hasta: datetimeLocalAUtc(hasta),
    motivo,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(PATH);
  return { error: null };
}

export async function quitarBloqueo(id: string) {
  const supabase = await createClient();
  await supabase.from('bloqueo').delete().eq('id', id);
  revalidatePath(PATH);
}
