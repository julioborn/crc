import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export function primerDiaMesActual(): string {
  const hoy = new Date();
  const primero = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), 1));
  return primero.toISOString().slice(0, 10);
}

/**
 * emitir_cuotas() es SECURITY DEFINER e idempotente (los índices únicos
 * parciales hacen "on conflict do nothing"), así que llamarla de nuevo
 * después de un alta o una inscripción es siempre seguro: solo genera la
 * cuota del socio/actividad nuevo si el período actual ya le corresponde
 * (fecha_alta futura => no hace nada todavía, el cron del día 1 la toma
 * cuando llegue el mes).
 */
export async function emitirCuotasDelMes(supabase: SupabaseClient<Database>) {
  await supabase.rpc('emitir_cuotas', { p_periodo: primerDiaMesActual() });
}
