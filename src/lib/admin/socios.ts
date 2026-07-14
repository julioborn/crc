'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { emitirCuotasDelMes } from '@/lib/cuotas/periodo';

export type SocioState = { error: string | null };

function grupoIdOrNull(value: string) {
  return value && value !== 'ninguno' ? value : null;
}

export async function altaSocio(
  _prevState: SocioState,
  formData: FormData,
): Promise<SocioState> {
  const usuarioId = String(formData.get('usuario_id') ?? '');
  const numeroSocio = Number(formData.get('numero_socio') ?? '');
  const fechaAlta = String(formData.get('fecha_alta') ?? '');
  const grupoFamiliarId = grupoIdOrNull(String(formData.get('grupo_familiar_id') ?? ''));
  const emailConfirmado = formData.get('email_confirmado') === 'on';

  if (!usuarioId) {
    return { error: 'Elegí un usuario.' };
  }
  if (!numeroSocio) {
    return { error: 'El número de socio es obligatorio.' };
  }
  if (!fechaAlta) {
    return { error: 'La fecha de alta es obligatoria.' };
  }
  // No es un chequeo de seguridad (eso lo resuelve la RLS) — es la regla del
  // dominio: el mail es el canal del link de pago y del recibo, así que la
  // confirmación es obligatoria pase lo que pase en el cliente.
  if (!emailConfirmado) {
    return { error: 'Tenés que confirmar que el mail del socio es correcto.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('socio').insert({
    usuario_id: usuarioId,
    numero_socio: numeroSocio,
    fecha_alta: fechaAlta,
    grupo_familiar_id: grupoFamiliarId,
  });

  if (error) {
    return { error: error.message };
  }

  // Si la fecha de alta ya cae en el período actual, la cuota social se
  // emite ahora — no hay que esperar al cron del día 1. Si es futura, esto
  // no hace nada (emitir_cuotas ya filtra por fecha_alta) y la toma el
  // cron cuando llegue el mes.
  await emitirCuotasDelMes(supabase);

  revalidatePath('/app/admin/socios');
  return { error: null };
}

export async function actualizarSocio(id: string, formData: FormData) {
  const numeroSocio = Number(formData.get('numero_socio') ?? '');
  const fechaAlta = String(formData.get('fecha_alta') ?? '');
  const fechaBaja = String(formData.get('fecha_baja') ?? '') || null;
  const grupoFamiliarId = grupoIdOrNull(String(formData.get('grupo_familiar_id') ?? ''));

  const supabase = await createClient();
  await supabase
    .from('socio')
    .update({
      numero_socio: numeroSocio,
      fecha_alta: fechaAlta,
      fecha_baja: fechaBaja,
      grupo_familiar_id: grupoFamiliarId,
    })
    .eq('id', id);

  revalidatePath('/app/admin/socios');
}
