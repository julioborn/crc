'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type RecursoState = { error: string | null };

const PATH = '/app/recursos';

export async function crearRecurso(
  _prevState: RecursoState,
  formData: FormData,
): Promise<RecursoState> {
  const nombre = String(formData.get('nombre') ?? '').trim();
  const areaId = String(formData.get('area_id') ?? '');
  const precioSocio = Number(formData.get('precio_socio') ?? '');
  const precioNoSocio = Number(formData.get('precio_no_socio') ?? '');
  const duracionMinutos = Number(formData.get('duracion_minutos') ?? '60');
  const horasCancelacion = Number(formData.get('horas_cancelacion') ?? '1');
  const aprobacionAutomatica = formData.get('aprobacion_automatica') === 'on';

  if (!nombre || !areaId || !precioSocio || !precioNoSocio) {
    return { error: 'Nombre, área y los dos precios son obligatorios.' };
  }

  const supabase = await createClient();
  // "recursos gestion" (puede_gestionar_area) es el gate real.
  const { error } = await supabase.from('recurso').insert({
    nombre,
    area_id: areaId,
    precio_socio: precioSocio,
    precio_no_socio: precioNoSocio,
    duracion_minutos: duracionMinutos,
    horas_cancelacion: horasCancelacion,
    aprobacion_automatica: aprobacionAutomatica,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(PATH);
  return { error: null };
}

export async function actualizarRecurso(id: string, formData: FormData) {
  const nombre = String(formData.get('nombre') ?? '').trim();
  const precioSocio = Number(formData.get('precio_socio') ?? '');
  const precioNoSocio = Number(formData.get('precio_no_socio') ?? '');
  const duracionMinutos = Number(formData.get('duracion_minutos') ?? '60');
  const horasCancelacion = Number(formData.get('horas_cancelacion') ?? '1');
  const aprobacionAutomatica = formData.get('aprobacion_automatica') === 'on';
  const activo = formData.get('activo') === 'on';

  const supabase = await createClient();
  await supabase
    .from('recurso')
    .update({
      nombre,
      precio_socio: precioSocio,
      precio_no_socio: precioNoSocio,
      duracion_minutos: duracionMinutos,
      horas_cancelacion: horasCancelacion,
      aprobacion_automatica: aprobacionAutomatica,
      activo,
    })
    .eq('id', id);

  revalidatePath(PATH);
}
