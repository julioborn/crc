import { DateTime } from 'luxon';
import { club } from '@/config/club';

/**
 * Todo lo que toca horarios de turnos pasa por acá. El servidor corre en
 * UTC (Vercel), la base guarda instantes UTC (timestamptz) — pero la
 * disponibilidad, los bloqueos y "hoy" siempre se piensan en la hora del
 * club. Mezclar esos dos mundos a mano (como pasaba antes, tratando
 * "22:00" como si ya fuera UTC) es exactamente el bug que esto resuelve.
 */
export const ZONA_CLUB = club.timezone;

/** "22:00" hora del club, en la fecha dada -> instante UTC en ISO. */
export function horaLocalAUtc(fechaISO: string, horaHHMM: string): string {
  const dt = DateTime.fromISO(`${fechaISO}T${horaHHMM}`, { zone: ZONA_CLUB });
  const utc = dt.toUTC().toISO();
  if (!utc) throw new Error(`Fecha/hora inválida: ${fechaISO} ${horaHHMM}`);
  return utc;
}

/**
 * Un <input type="datetime-local"> no lleva zona horaria — lo que el
 * admin tipeó ahí es hora del club, no UTC ni la del navegador.
 */
export function datetimeLocalAUtc(valor: string): string {
  const dt = DateTime.fromISO(valor, { zone: ZONA_CLUB });
  const utc = dt.toUTC().toISO();
  if (!utc) throw new Error(`Fecha/hora inválida: ${valor}`);
  return utc;
}

/**
 * Límites del día CALENDARIO del club (00:00 a 23:59:59.999 hora local),
 * convertidos a UTC — para filtrar "los turnos/bloqueos de este día" sin
 * que se corran por el offset de -3hs.
 */
export function limitesDiaLocalUtc(fechaISO: string): { desde: string; hasta: string } {
  const inicio = DateTime.fromISO(fechaISO, { zone: ZONA_CLUB }).startOf('day');
  const fin = inicio.endOf('day');
  const desde = inicio.toUTC().toISO();
  const hasta = fin.toUTC().toISO();
  if (!desde || !hasta) throw new Error(`Fecha inválida: ${fechaISO}`);
  return { desde, hasta };
}

/** "Hoy" en el calendario del club, no en el del servidor. */
export function hoyLocal(): string {
  return DateTime.now().setZone(ZONA_CLUB).toFormat('yyyy-LL-dd');
}

export function formatearHoraLocal(instanteUtc: string): string {
  return DateTime.fromISO(instanteUtc, { zone: 'utc' }).setZone(ZONA_CLUB).toFormat('HH:mm');
}

export function formatearFechaHoraLocal(instanteUtc: string): string {
  return DateTime.fromISO(instanteUtc, { zone: 'utc' })
    .setZone(ZONA_CLUB)
    .toFormat("dd/LL/yyyy HH:mm");
}
