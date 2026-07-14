import { horaLocalAUtc } from './tz';

export type Franja = { dia_semana: number; hora_desde: string; hora_hasta: string };
export type Ocupado = { inicio: string; fin: string };
export type Slot = { inicio: string; fin: string };

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

export function calcularSlotsLibres(params: {
  fecha: string; // YYYY-MM-DD, fecha de calendario (elegida en un <input type="date">)
  duracionMinutos: number;
  franjas: Franja[];
  ocupados: Ocupado[]; // turnos activos + bloqueos, ya combinados
}): Slot[] {
  const { fecha, duracionMinutos, franjas, ocupados } = params;

  // El día de la semana de una fecha-calendario (2026-07-15 es miércoles)
  // no depende de zona horaria — es la HORA dentro de ese día la que sí.
  const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay();

  const ocupadosMs = ocupados.map((o) => ({
    inicio: new Date(o.inicio).getTime(),
    fin: new Date(o.fin).getTime(),
  }));

  const slots: Slot[] = [];

  for (const franja of franjas.filter((f) => f.dia_semana === diaSemana)) {
    let cursor = franja.hora_desde.slice(0, 5);
    const finFranja = franja.hora_hasta.slice(0, 5);

    while (true) {
      const siguiente = sumarMinutos(cursor, duracionMinutos);
      if (siguiente > finFranja) break;

      // hora_desde/hora_hasta son hora LOCAL del club (así se cargan en
      // /app/recursos) — horaLocalAUtc hace la conversión real a UTC.
      // Antes acá se armaba "${fecha}T${cursor}:00Z", tratando la hora
      // local como si ya fuera UTC: con Buenos Aires en UTC-3, un turno
      // de las 22:00 terminaba guardado (y comparado) 3 horas corrido.
      const inicioISO = horaLocalAUtc(fecha, cursor);
      const finISO = horaLocalAUtc(fecha, siguiente);
      const inicioMs = new Date(inicioISO).getTime();
      const finMs = new Date(finISO).getTime();

      const ocupado = ocupadosMs.some((o) => seSuperponen(inicioMs, finMs, o.inicio, o.fin));
      if (!ocupado) {
        slots.push({ inicio: inicioISO, fin: finISO });
      }

      cursor = siguiente;
    }
  }

  return slots.sort((a, b) => a.inicio.localeCompare(b.inicio));
}
