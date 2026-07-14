'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

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
  const { error } = await supabase.from('bloqueo').insert({
    recurso_id: recursoId,
    desde,
    hasta,
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
