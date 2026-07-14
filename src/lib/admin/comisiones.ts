'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ComisionState = { error: string | null };

function friendlyError(message: string) {
  // 23P01 = exclusion_violation, es el constraint directiva_sin_solapamiento.
  if (message.includes('directiva_sin_solapamiento')) {
    return 'Ya hay una Comisión Directiva vigente en ese rango de fechas. Cerrale el mandato antes de crear la siguiente.';
  }
  if (message.includes('comision_check')) {
    return 'El mandato tiene que terminar después de que empieza.';
  }
  return message;
}

export async function crearComision(
  _prevState: ComisionState,
  formData: FormData,
): Promise<ComisionState> {
  const nombre = String(formData.get('nombre') ?? '').trim();
  const mandatoDesde = String(formData.get('mandato_desde') ?? '');
  const mandatoHasta = String(formData.get('mandato_hasta') ?? '');
  const esDirectiva = formData.get('es_directiva') === 'on';

  if (!nombre || !mandatoDesde || !mandatoHasta) {
    return { error: 'Nombre y mandato (desde/hasta) son obligatorios.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('comision').insert({
    nombre,
    mandato_desde: mandatoDesde,
    mandato_hasta: mandatoHasta,
    es_directiva: esDirectiva,
  });

  if (error) {
    return { error: friendlyError(error.message) };
  }

  revalidatePath('/app/admin/comisiones');
  return { error: null };
}

export async function actualizarComision(id: string, formData: FormData) {
  const nombre = String(formData.get('nombre') ?? '').trim();
  const mandatoDesde = String(formData.get('mandato_desde') ?? '');
  const mandatoHasta = String(formData.get('mandato_hasta') ?? '');
  const esDirectiva = formData.get('es_directiva') === 'on';

  const supabase = await createClient();
  await supabase
    .from('comision')
    .update({
      nombre,
      mandato_desde: mandatoDesde,
      mandato_hasta: mandatoHasta,
      es_directiva: esDirectiva,
    })
    .eq('id', id);

  revalidatePath('/app/admin/comisiones');
}

export async function actualizarAreasComision(comisionId: string, formData: FormData) {
  const areaIds = formData.getAll('area_ids').map(String);

  const supabase = await createClient();
  // Reemplazo completo: se borra la asignación anterior y se inserta la
  // nueva. comision_area no tiene columnas propias, así que no hay nada
  // que perder haciéndolo así — y evita lógica de diff.
  await supabase.from('comision_area').delete().eq('comision_id', comisionId);
  if (areaIds.length > 0) {
    await supabase
      .from('comision_area')
      .insert(areaIds.map((area_id) => ({ comision_id: comisionId, area_id })));
  }

  revalidatePath('/app/admin/comisiones');
}
