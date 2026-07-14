import { horaLocalAUtc, sumarDiasLocal } from './tz';

export type Franja = { dia_semana: number; hora_desde: string; hora_hasta: string };
export type Ocupado = { inicio: string; fin: string };
export type Slot = { inicio: string; fin: string };
export type EstadoCelda = 'libre' | 'ocupado' | 'bloqueado' | 'mio' | 'pasado';
export type Celda = Slot & { estado: EstadoCelda };

function minutosDesdeMedianoche(horaHHMM: string): number {
  const [h, m] = horaHHMM.split(':').map(Number);
  return h * 60 + m;
}

function formatoDesdeMinutos(minutos: number): string {
  const hh = Math.floor(minutos / 60)
    .toString()
    .padStart(2, '0');
  const mm = (minutos % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Instante UTC para "minutos desde la medianoche de `fecha`" — puede
 * superar 1440 (cruza a la fecha siguiente, o varias). */
function instanteLocal(fecha: string, minutosTotales: number): string {
  const dias = Math.floor(minutosTotales / 1440);
  const horaHHMM = formatoDesdeMinutos(minutosTotales - dias * 1440);
  const fechaAjustada = dias === 0 ? fecha : sumarDiasLocal(fecha, dias);
  return horaLocalAUtc(fechaAjustada, horaHHMM);
}

function seSuperponen(aInicio: number, aFin: number, bInicio: number, bFin: number): boolean {
  return aInicio < bFin && aFin > bInicio;
}

/**
 * Candidatos de horario para un recurso en una fecha, SIN mirar todavía
 * si están ocupados — es la grilla completa de "acá podría empezar un
 * turno", que después se cruza contra turnos/bloqueos (calcularSlotsLibres)
 * o se usa para pintar el estado de cada celda (calcularCeldas).
 */
function generarCandidatos(fecha: string, duracionMinutos: number, franjas: Franja[]): Slot[] {
  const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  const slots: Slot[] = [];

  for (const franja of franjas.filter((f) => f.dia_semana === diaSemana)) {
    const desdeMin = minutosDesdeMedianoche(franja.hora_desde.slice(0, 5));
    let hastaMin = minutosDesdeMedianoche(franja.hora_hasta.slice(0, 5));
    // hora_hasta <= hora_desde: la franja cruza la medianoche y termina
    // al día siguiente (p. ej. pádel 08:30–02:30, fútbol 07:00–02:00).
    if (hastaMin <= desdeMin) hastaMin += 24 * 60;

    let cursor = desdeMin;
    while (cursor + duracionMinutos <= hastaMin) {
      slots.push({
        inicio: instanteLocal(fecha, cursor),
        fin: instanteLocal(fecha, cursor + duracionMinutos),
      });
      cursor += duracionMinutos;
    }
  }

  return slots.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export function calcularSlotsLibres(params: {
  fecha: string;
  duracionMinutos: number;
  franjas: Franja[];
  ocupados: Ocupado[];
}): Slot[] {
  const candidatos = generarCandidatos(params.fecha, params.duracionMinutos, params.franjas);
  const ocupadosMs = params.ocupados.map((o) => ({
    inicio: new Date(o.inicio).getTime(),
    fin: new Date(o.fin).getTime(),
  }));

  return candidatos.filter((c) => {
    const inicioMs = new Date(c.inicio).getTime();
    const finMs = new Date(c.fin).getTime();
    return !ocupadosMs.some((o) => seSuperponen(inicioMs, finMs, o.inicio, o.fin));
  });
}

/**
 * Todos los candidatos de un recurso, cada uno con su estado — para la
 * grilla del panel de reserva, donde lo ocupado/bloqueado se MUESTRA
 * (no se oculta): el socio tiene que entender por qué no puede reservar
 * a las 20:00, no solo ver que esa opción no está.
 */
export function calcularCeldas(params: {
  fecha: string;
  duracionMinutos: number;
  franjas: Franja[];
  // Viene de la RPC horarios_ocupados() — nunca de un select directo a
  // turno: esa tabla solo deja ver tus propios turnos o los de tu área
  // (RLS "veo mis turnos"), así que un socio común no vería los turnos
  // de otras personas y la grilla mostraría todo como libre.
  ocupados: { inicio: string; fin: string; es_mio: boolean }[];
  bloqueos: Ocupado[];
  // Instante UTC "ahora" — un candidato que ya empezó no se puede
  // reservar, aunque nadie lo haya ocupado.
  ahoraUtc: string;
}): Celda[] {
  const candidatos = generarCandidatos(params.fecha, params.duracionMinutos, params.franjas);

  const ocupadosMs = params.ocupados.map((t) => ({
    inicio: new Date(t.inicio).getTime(),
    fin: new Date(t.fin).getTime(),
    es_mio: t.es_mio,
  }));
  const bloqueosMs = params.bloqueos.map((b) => ({
    inicio: new Date(b.inicio).getTime(),
    fin: new Date(b.fin).getTime(),
  }));
  const ahoraMs = new Date(params.ahoraUtc).getTime();

  return candidatos.map((c) => {
    const inicioMs = new Date(c.inicio).getTime();
    const finMs = new Date(c.fin).getTime();

    const turnoPropio = ocupadosMs.find(
      (t) => t.es_mio && seSuperponen(inicioMs, finMs, t.inicio, t.fin),
    );
    if (turnoPropio) return { ...c, estado: 'mio' as const };

    const ocupadoPorOtro = ocupadosMs.some((t) => seSuperponen(inicioMs, finMs, t.inicio, t.fin));
    if (ocupadoPorOtro) return { ...c, estado: 'ocupado' as const };

    const bloqueado = bloqueosMs.some((b) => seSuperponen(inicioMs, finMs, b.inicio, b.fin));
    if (bloqueado) return { ...c, estado: 'bloqueado' as const };

    if (inicioMs < ahoraMs) return { ...c, estado: 'pasado' as const };

    return { ...c, estado: 'libre' as const };
  });
}
