import type { Enums } from '@/lib/supabase/types';

export type Categoria = Enums<'notificacion_categoria'>;

/** cuota_vencida es institucional: no aparece en preferencias (no se
 * puede apagar) — push-send la manda siempre, sin mirar la tabla. */
export const CATEGORIAS_CONFIGURABLES: { valor: Categoria; label: string; descripcion?: string }[] = [
  { valor: 'aviso', label: 'Avisos del club', descripcion: 'Globales y de las áreas en las que estás inscripto.' },
  { valor: 'cuota_emitida', label: 'Cuota nueva' },
  { valor: 'cuota_por_vencer', label: 'Cuota por vencer', descripcion: '3 días antes del vencimiento.' },
  { valor: 'turno_confirmado', label: 'Turno confirmado' },
  { valor: 'turno_rechazado', label: 'Turno rechazado' },
  { valor: 'recordatorio_turno', label: 'Recordatorio de turno', descripcion: '1 hora antes.' },
  { valor: 'pago_acreditado', label: 'Pago acreditado' },
];

export const CATEGORIA_LABEL: Record<Categoria, string> = {
  aviso: 'Aviso',
  cuota_emitida: 'Cuota nueva',
  cuota_por_vencer: 'Cuota por vencer',
  cuota_vencida: 'Cuota vencida',
  turno_confirmado: 'Turno confirmado',
  turno_rechazado: 'Turno rechazado',
  recordatorio_turno: 'Recordatorio de turno',
  pago_acreditado: 'Pago acreditado',
};
