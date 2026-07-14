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
  const dias = formData.getAll('dias').map(Number);
  const horaDesde = String(formData.get('hora_desde') ?? '');
  const horaHasta = String(formData.get('hora_hasta') ?? '');

  if (dias.length === 0 || dias.some(Number.isNaN) || !horaDesde || !horaHasta) {
    return { error: 'Elegí al menos un día y el horario.' };
  }
  // hora_hasta <= hora_desde es válido: significa que la franja cruza la
  // medianoche (p. ej. 20:00 a 02:00). Solo una franja de largo cero es
  // un error.
  if (horaHasta === horaDesde) {
    return { error: 'El horario "hasta" no puede ser igual al "desde".' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('disponibilidad').insert(
    dias.map((diaSemana) => ({
      recurso_id: recursoId,
      dia_semana: diaSemana,
      hora_desde: horaDesde,
      hora_hasta: horaHasta,
    })),
  );

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
