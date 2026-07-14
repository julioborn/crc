'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type GrupoState = { error: string | null };

const PATH = '/app/admin/grupos-familiares';

export async function crearGrupo(
  _prevState: GrupoState,
  formData: FormData,
): Promise<GrupoState> {
  const nombre = String(formData.get('nombre') ?? '').trim();

  if (!nombre) {
    return { error: 'El nombre es obligatorio.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('grupo_familiar').insert({ nombre });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(PATH);
  return { error: null };
}

export async function actualizarGrupo(id: string, formData: FormData) {
  const nombre = String(formData.get('nombre') ?? '').trim();
  const activo = formData.get('activo') === 'on';
  const titularId = String(formData.get('titular_id') ?? '') || null;

  const supabase = await createClient();
  await supabase
    .from('grupo_familiar')
    .update({ nombre, activo, titular_id: titularId })
    .eq('id', id);

  revalidatePath(PATH);
}

export async function agregarSocioAGrupo(grupoId: string, formData: FormData) {
  const socioId = String(formData.get('socio_id') ?? '');
  if (!socioId) return;

  const supabase = await createClient();
  await supabase.from('socio').update({ grupo_familiar_id: grupoId }).eq('id', socioId);

  revalidatePath(PATH);
}

export async function quitarSocioDeGrupo(socioId: string) {
  const supabase = await createClient();

  // Si el socio que sale era el titular, el grupo queda sin titular hasta
  // que la CD elija otro — no se puede dejar apuntando a alguien que ya
  // no es miembro.
  const { data: socio } = await supabase
    .from('socio')
    .select('grupo_familiar_id')
    .eq('id', socioId)
    .single();

  if (socio?.grupo_familiar_id) {
    await supabase
      .from('grupo_familiar')
      .update({ titular_id: null })
      .eq('id', socio.grupo_familiar_id)
      .eq('titular_id', socioId);
  }

  await supabase.from('socio').update({ grupo_familiar_id: null }).eq('id', socioId);

  revalidatePath(PATH);
}
