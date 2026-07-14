export type Franja = { dia_semana: number; hora_desde: string; hora_hasta: string };
export type Ocupado = { inicio: string; fin: string };
export type Slot = { inicio: string; fin: string };

/**
 * NOTA: todo esto trabaja en UTC "de forma consistente" (la hora que se
 * carga en disponibilidad se trata como si ya fuera la hora del club, sin
 * conversión de zona horaria). Para producción real con usuarios en
 * Argentina hace falta una config de timezone del club y una librería
 * TZ-aware — acá se mantiene simple porque el resto del proyecto tampoco
 * define una zona horaria todavía. Mientras se escriba y se lea siempre
 * con el mismo criterio, los cálculos de superposición son correctos.
 */

function sumarMinutos(horaHHMM: string, minutos: number): string {
  const [h, m] = horaHHMM.split(':').map(Number);
  const total = h * 60 + m + minutos;
  const hh = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function seSuperponen(aInicio: string, aFin: string, bInicio: string, bFin: string): boolean {
  return aInicio < bFin && aFin > bInicio;
}

export function calcularSlotsLibres(params: {
  fecha: string; // YYYY-MM-DD
  duracionMinutos: number;
  franjas: Franja[];
  ocupados: Ocupado[]; // turnos pendientes/confirmados + bloqueos, ya combinados
}): Slot[] {
  const { fecha, duracionMinutos, franjas, ocupados } = params;
  const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay();

  const slots: Slot[] = [];

  for (const franja of franjas.filter((f) => f.dia_semana === diaSemana)) {
    let cursor = franja.hora_desde.slice(0, 5);
    const fin = franja.hora_hasta.slice(0, 5);

    while (true) {
      const siguiente = sumarMinutos(cursor, duracionMinutos);
      if (siguiente > fin) break;

      const inicioISO = `${fecha}T${cursor}:00Z`;
      const finISO = `${fecha}T${siguiente}:00Z`;

      const ocupado = ocupados.some((o) => seSuperponen(inicioISO, finISO, o.inicio, o.fin));
      if (!ocupado) {
        slots.push({ inicio: inicioISO, fin: finISO });
      }

      cursor = siguiente;
    }
  }

  return slots.sort((a, b) => a.inicio.localeCompare(b.inicio));
}
