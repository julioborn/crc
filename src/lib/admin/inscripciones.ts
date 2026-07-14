'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type InscripcionState = { error: string | null };

const PATH = '/app/inscripciones';

export async function inscribirSocio(
  _prevState: InscripcionState,
  formData: FormData,
): Promise<InscripcionState> {
  const socioId = String(formData.get('socio_id') ?? '');
  const areaId = String(formData.get('area_id') ?? '');
  const fechaAlta = String(formData.get('fecha_alta') ?? '');

  if (!socioId || !areaId || !fechaAlta) {
    return { error: 'Elegí un socio, un área y la fecha.' };
  }

  const supabase = await createClient();
  // "gestiono actividades de mi area" (es_directiva() OR
  // puede_gestionar_area(area_id)) es el gate real — si el área no es la
  // suya, esto falla solo, sin reinventar el chequeo acá.
  const { error } = await supabase.from('socio_area').insert({
    socio_id: socioId,
    area_id: areaId,
    fecha_alta: fechaAlta,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(PATH);
  return { error: null };
}

export async function darDeBajaInscripcion(id: string, formData: FormData) {
  const fechaBaja =
    String(formData.get('fecha_baja') ?? '') || new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  await supabase.from('socio_area').update({ fecha_baja: fechaBaja }).eq('id', id);

  revalidatePath(PATH);
}
