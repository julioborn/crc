'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type DisponibilidadState = { error: string | null };

const PATH = '/app/recursos';

export async function agregarDisponibilidad(
  recursoId: string,
  _prevState: DisponibilidadState,
  formData: FormData,
): Promise<DisponibilidadState> {
  const diaSemana = Number(formData.get('dia_semana') ?? '');
  const horaDesde = String(formData.get('hora_desde') ?? '');
  const horaHasta = String(formData.get('hora_hasta') ?? '');

  if (Number.isNaN(diaSemana) || !horaDesde || !horaHasta) {
    return { error: 'Elegí día y horario.' };
  }
  if (horaHasta <= horaDesde) {
    return { error: 'El horario hasta tiene que ser posterior al desde.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('disponibilidad').insert({
    recurso_id: recursoId,
    dia_semana: diaSemana,
    hora_desde: horaDesde,
    hora_hasta: horaHasta,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(PATH);
  return { error: null };
}

export async function quitarDisponibilidad(id: string) {
  const supabase = await createClient();
  await supabase.from('disponibilidad').delete().eq('id', id);
  revalidatePath(PATH);
}
