'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const PATH = '/app/notificaciones';

export async function marcarNotificacionLeida(id: string) {
  const supabase = await createClient();
  await supabase.from('notificacion').update({ leida_at: new Date().toISOString() }).eq('id', id);
  revalidatePath(PATH);
  revalidatePath('/app');
}

export async function marcarTodasLeidas() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('notificacion')
    .update({ leida_at: new Date().toISOString() })
    .eq('usuario_id', user.id)
    .is('leida_at', null);

  revalidatePath(PATH);
  revalidatePath('/app');
}
