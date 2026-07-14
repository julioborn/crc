'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type EgresoState = { error: string | null };

const PATH = '/app/egresos';

export async function registrarEgreso(
  _prevState: EgresoState,
  formData: FormData,
): Promise<EgresoState> {
  const areaRaw = String(formData.get('area_id') ?? '');
  const areaId = areaRaw && areaRaw !== 'club' ? areaRaw : null;
  const monto = Number(formData.get('monto') ?? '');
  const concepto = String(formData.get('concepto') ?? '').trim();
  const fecha = String(formData.get('fecha') ?? '') || undefined;
  const comprobanteUrl = String(formData.get('comprobante_url') ?? '').trim() || null;

  if (!monto || monto <= 0) {
    return { error: 'El monto tiene que ser mayor a cero.' };
  }
  if (!concepto) {
    return { error: 'Contá en qué se gastó.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Iniciá sesión de nuevo.' };
  }

  const { data: comisionId } = await supabase.rpc('comision_responsable', {
    p_area_id: areaId,
  });
  if (!comisionId) {
    return { error: 'No hay ninguna comisión vigente para imputar este gasto.' };
  }

  // "registro movimientos de mi area" es el gate real: usuario_id tiene
  // que ser quien llama, y si area_id no es null, tiene que
  // puede_gestionar_area(area_id) — o ser CD para el gasto del club.
  const { error } = await supabase.from('movimiento').insert({
    tipo: 'egreso',
    monto,
    concepto,
    area_id: areaId,
    comision_id: comisionId,
    usuario_id: user.id,
    comprobante_url: comprobanteUrl,
    ...(fecha ? { fecha } : {}),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(PATH);
  return { error: null };
}
