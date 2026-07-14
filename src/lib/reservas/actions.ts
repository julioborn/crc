'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { hoyLocal } from './tz';

export type ReservaState = { error: string | null };

function friendlyError(message: string) {
  if (message.includes('turno_sin_solapamiento')) {
    return 'Justo se ocupó ese horario. Elegí otro.';
  }
  return message;
}

export async function reservarTurno(
  _prevState: ReservaState,
  formData: FormData,
): Promise<ReservaState> {
  const recursoId = String(formData.get('recurso_id') ?? '');
  const inicio = String(formData.get('inicio') ?? '');
  const fin = String(formData.get('fin') ?? '');

  if (!recursoId || !inicio || !fin) {
    return { error: 'Falta información del turno.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Iniciá sesión de nuevo.' };
  }

  const { data: recurso } = await supabase
    .from('recurso')
    .select('precio_socio, precio_no_socio, activo')
    .eq('id', recursoId)
    .single();

  if (!recurso || !recurso.activo) {
    return { error: 'Ese recurso ya no está disponible.' };
  }

  const hoy = hoyLocal();
  const { data: socio } = await supabase
    .from('socio')
    .select('id')
    .eq('usuario_id', user.id)
    .lte('fecha_alta', hoy)
    .or(`fecha_baja.is.null,fecha_baja.gte.${hoy}`)
    .maybeSingle();

  const esSocio = !!socio;
  const precio = esSocio ? recurso.precio_socio : recurso.precio_no_socio;

  // No se manda "estado": el trigger aplicar_aprobacion_automatica decide
  // si nace confirmado o pendiente_aprobacion según el recurso. El
  // EXCLUDE de la base (turno_sin_solapamiento) es la última palabra si
  // dos personas reservan el mismo segundo — acá solo se traduce el
  // error a algo legible.
  const { error } = await supabase.from('turno').insert({
    recurso_id: recursoId,
    usuario_id: user.id,
    inicio,
    fin,
    precio,
    era_socio: esSocio,
  });

  if (error) {
    return { error: friendlyError(error.message) };
  }

  revalidatePath('/app/reservar');
  revalidatePath('/app/mis-turnos');
  return { error: null };
}
