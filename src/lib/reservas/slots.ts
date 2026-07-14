import { horaLocalAUtc } from './tz';

export type Franja = { dia_semana: number; hora_desde: string; hora_hasta: string };
export type Ocupado = { inicio: string; fin: string };
export type Slot = { inicio: string; fin: string };
export type EstadoCelda = 'libre' | 'ocupado' | 'bloqueado' | 'mio';
export type Celda = Slot & { estado: EstadoCelda };

function sumarMinutos(horaHHMM: string, minutos: number): string {
  const [h, m] = horaHHMM.split(':').map(Number);
  const total = h * 60 + m + minutos;
  const hh = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
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
    let cursor = franja.hora_desde.slice(0, 5);
    const finFranja = franja.hora_hasta.slice(0, 5);

    while (true) {
      const siguiente = sumarMinutos(cursor, duracionMinutos);
      if (siguiente > finFranja) break;

      // hora_desde/hora_hasta son hora LOCAL del club — horaLocalAUtc hace
      // la conversión real a UTC (antes se armaba "${fecha}T${cursor}:00Z",
      // tratando la hora local como si ya fuera UTC).
      slots.push({ inicio: horaLocalAUtc(fecha, cursor), fin: horaLocalAUtc(fecha, siguiente) });
      cursor = siguiente;
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

    return { ...c, estado: 'libre' as const };
  });
}
