'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type AreaState = { error: string | null };

export async function crearArea(
  _prevState: AreaState,
  formData: FormData,
): Promise<AreaState> {
  const nombre = String(formData.get('nombre') ?? '').trim();
  const descripcion = String(formData.get('descripcion') ?? '').trim() || null;
  const esInscribible = formData.get('es_inscribible') === 'on';

  if (!nombre) {
    return { error: 'El nombre es obligatorio.' };
  }

  const supabase = await createClient();
  // La policy "areas admin" (es_directiva()) es el gate real. Este action
  // solo llega a un CD porque el layout de /app/admin ya redirige al resto.
  const { error } = await supabase
    .from('area')
    .insert({ nombre, descripcion, es_inscribible: esInscribible });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/app/admin/areas');
  return { error: null };
}

export async function actualizarArea(id: string, formData: FormData) {
  const nombre = String(formData.get('nombre') ?? '').trim();
  const descripcion = String(formData.get('descripcion') ?? '').trim() || null;
  const esInscribible = formData.get('es_inscribible') === 'on';
  const activa = formData.get('activa') === 'on';

  const supabase = await createClient();
  await supabase
    .from('area')
    .update({ nombre, descripcion, es_inscribible: esInscribible, activa })
    .eq('id', id);

  revalidatePath('/app/admin/areas');
}
