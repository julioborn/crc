'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ArancelState = { error: string | null };

const PATH = '/app/admin/aranceles';

function friendlyError(message: string) {
  if (message.includes('tiene que ser posterior')) return message;
  if (message.includes('arancel_sin_solapamiento')) {
    return 'Esa vigencia se superpone con otro arancel del mismo tipo/área.';
  }
  if (message.includes('arancel_check')) {
    return 'Actividad necesita un área; social/social_familiar no llevan área.';
  }
  return message;
}

export async function crearArancel(
  _prevState: ArancelState,
  formData: FormData,
): Promise<ArancelState> {
  const tipo = String(formData.get('tipo') ?? '');
  const areaId = tipo === 'actividad' ? String(formData.get('area_id') ?? '') || null : null;
  const monto = Number(formData.get('monto') ?? '');
  const vigenteDesde = String(formData.get('vigente_desde') ?? '');

  if (!tipo || !monto || !vigenteDesde) {
    return { error: 'Tipo, monto y vigencia desde son obligatorios.' };
  }
  if (tipo === 'actividad' && !areaId) {
    return { error: 'Un arancel de actividad necesita un área.' };
  }

  const supabase = await createClient();
  // cerrar_y_crear_arancel es SECURITY INVOKER: la RLS de "arancel"
  // (CD-only) es el gate real, y PostgREST ejecuta el RPC en una sola
  // transacción, así que el cierre del vigente + el alta del nuevo son
  // atómicos sin trucos extra acá.
  // El generador de tipos marca p_area_id como no-nulo, pero la función
  // (uuid sin NOT NULL) acepta null sin problema — social/social
  // familiar no llevan área.
  const { error } = await supabase.rpc('cerrar_y_crear_arancel', {
    p_tipo: tipo,
    p_area_id: areaId as string,
    p_monto: monto,
    p_vigente_desde: vigenteDesde,
  });

  if (error) {
    return { error: friendlyError(error.message) };
  }

  revalidatePath(PATH);
  return { error: null };
}
