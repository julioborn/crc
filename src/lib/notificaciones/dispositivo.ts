'use server';

import { createClient } from '@/lib/supabase/server';

export type Plataforma = 'web' | 'android' | 'ios';

/**
 * Un mismo token de este navegador puede haber quedado de otra sesión
 * (logout/login con otro usuario en el mismo dispositivo) — el upsert
 * por fcm_token (unique) lo reasigna al usuario actual en vez de dejar
 * dos filas peleando por el mismo token.
 */
export async function registrarDispositivo(fcmToken: string, plataforma: Plataforma) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Iniciá sesión de nuevo.' };

  const { error } = await supabase
    .from('dispositivo')
    .upsert(
      { usuario_id: user.id, fcm_token: fcmToken, plataforma, ultimo_uso: new Date().toISOString() },
      { onConflict: 'fcm_token' },
    );

  if (error) return { error: error.message };
  return { error: null };
}

export async function eliminarDispositivo(fcmToken: string) {
  const supabase = await createClient();
  await supabase.from('dispositivo').delete().eq('fcm_token', fcmToken);
}
