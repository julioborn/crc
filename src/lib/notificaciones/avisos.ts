'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type AvisoState = { error: string | null };

const PATH = '/app/avisos';

// El fan-out a notificacion (y de ahí al push) lo hace el trigger
// notificar_aviso() en la base, disparado por este INSERT — no hay
// nada más que hacer acá para que el aviso salga.
export async function crearAviso(_prevState: AvisoState, formData: FormData): Promise<AvisoState> {
  const alcance = String(formData.get('alcance') ?? '');
  const areaId = alcance === 'area' ? String(formData.get('area_id') ?? '') || null : null;
  const titulo = String(formData.get('titulo') ?? '').trim();
  const cuerpo = String(formData.get('cuerpo') ?? '').trim();
  const imagenUrl = String(formData.get('imagen_url') ?? '').trim() || null;

  if (alcance !== 'global' && alcance !== 'area') {
    return { error: 'Elegí el alcance del aviso.' };
  }
  if (alcance === 'area' && !areaId) {
    return { error: 'Elegí el área.' };
  }
  if (!titulo || !cuerpo) {
    return { error: 'Completá título y cuerpo.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Iniciá sesión de nuevo.' };

  // El generador de tipos marca p_area_id como no-nulo, pero la función
  // (uuid sin NOT NULL) acepta null sin problema — un aviso global no
  // lleva área.
  const { data: comisionId } = await supabase.rpc('comision_responsable', { p_area_id: areaId as string });
  if (!comisionId) {
    return { error: 'No hay ninguna comisión vigente para publicar este aviso.' };
  }

  const { error } = await supabase.from('aviso').insert({
    titulo,
    cuerpo,
    alcance,
    area_id: areaId,
    comision_id: comisionId,
    usuario_id: user.id,
    imagen_url: imagenUrl,
  });

  if (error) return { error: error.message };

  revalidatePath(PATH);
  revalidatePath('/app');
  return { error: null };
}

export async function editarAviso(
  avisoId: string,
  _prevState: AvisoState,
  formData: FormData,
): Promise<AvisoState> {
  const titulo = String(formData.get('titulo') ?? '').trim();
  const cuerpo = String(formData.get('cuerpo') ?? '').trim();
  const imagenUrl = String(formData.get('imagen_url') ?? '').trim() || null;

  if (!titulo || !cuerpo) {
    return { error: 'Completá título y cuerpo.' };
  }

  const supabase = await createClient();
  // RLS ("edito mi aviso"): autor o CD, y si no es CD tiene que seguir
  // gestionando el área del aviso.
  const { error } = await supabase
    .from('aviso')
    .update({ titulo, cuerpo, imagen_url: imagenUrl })
    .eq('id', avisoId);

  if (error) return { error: error.message };

  revalidatePath(PATH);
  return { error: null };
}

export async function borrarAviso(avisoId: string) {
  const supabase = await createClient();
  // RLS ("borro mi aviso"): autor o CD.
  await supabase.from('aviso').delete().eq('id', avisoId);
  revalidatePath(PATH);
}

export async function marcarAvisoLeido(avisoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('aviso_lectura').upsert(
    { aviso_id: avisoId, usuario_id: user.id },
    { onConflict: 'aviso_id,usuario_id', ignoreDuplicates: true },
  );
  revalidatePath(PATH);
}
