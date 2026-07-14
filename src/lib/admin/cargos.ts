'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

export type CargoState = { error: string | null };

type CargoTipo = Database['public']['Enums']['cargo_tipo'];

export async function asignarCargo(
  _prevState: CargoState,
  formData: FormData,
): Promise<CargoState> {
  const usuarioId = String(formData.get('usuario_id') ?? '');
  const comisionId = String(formData.get('comision_id') ?? '');
  const cargo = String(formData.get('cargo') ?? '') as CargoTipo;
  const vigenteDesde = String(formData.get('vigente_desde') ?? '');
  const vigenteHasta = String(formData.get('vigente_hasta') ?? '') || null;

  if (!usuarioId || !comisionId || !cargo || !vigenteDesde) {
    return { error: 'Elegí un usuario, una comisión, un cargo y la fecha desde.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('cargo_comision').insert({
    usuario_id: usuarioId,
    comision_id: comisionId,
    cargo,
    vigente_desde: vigenteDesde,
    vigente_hasta: vigenteHasta,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/app/admin/cargos');
  return { error: null };
}

export async function actualizarCargo(id: string, formData: FormData) {
  const cargo = String(formData.get('cargo') ?? '') as CargoTipo;
  const vigenteDesde = String(formData.get('vigente_desde') ?? '');
  const vigenteHasta = String(formData.get('vigente_hasta') ?? '') || null;

  const supabase = await createClient();
  // Nunca se borra un cargo_comision: el historial de quién ocupó qué
  // cargo y cuándo es justamente lo que pide Fase 1. "Cerrar" un mandato
  // es poner vigente_hasta, no eliminar la fila.
  await supabase
    .from('cargo_comision')
    .update({ cargo, vigente_desde: vigenteDesde, vigente_hasta: vigenteHasta })
    .eq('id', id);

  revalidatePath('/app/admin/cargos');
}
