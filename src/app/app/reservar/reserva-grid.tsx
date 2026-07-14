'use client';

import { useActionState, useState } from 'react';
import { reservarTurno, type ReservaState } from '@/lib/reservas/actions';
import { formatearHoraLocal } from '@/lib/reservas/tz';
import { SubmitButton } from '@/components/submit-button';
import { PedirPermisoPush } from '@/components/notificaciones/pedir-permiso-push';
import { cn } from '@/lib/utils';
import type { Celda, EstadoCelda } from '@/lib/reservas/slots';

type Recurso = {
  id: string;
  nombre: string;
  precio_socio: number;
  precio_no_socio: number;
};

type Fila = { horaLabel: string; celdas: Record<string, Celda | undefined> };

const initialState: ReservaState = { error: null };

const ESTILO_CELDA: Record<EstadoCelda, string> = {
  libre:
    'border-primary/40 bg-card text-primary hover:border-primary hover:bg-primary/10 cursor-pointer',
  ocupado: 'border-transparent bg-muted text-muted-foreground cursor-not-allowed',
  bloqueado: 'border-transparent bg-ink/[0.06] text-muted-foreground cursor-not-allowed',
  mio: 'border-primary bg-primary/20 text-ink font-medium cursor-not-allowed',
  pasado: 'border-transparent bg-transparent text-muted-foreground/40 cursor-not-allowed',
};

const LABEL_ESTADO: Record<EstadoCelda, string> = {
  libre: 'Libre',
  ocupado: 'Ocupado',
  bloqueado: 'Bloqueado',
  mio: 'Tuyo',
  pasado: 'Pasó',
};

function ConfirmarReserva({
  recurso,
  celda,
  esSocio,
  onCerrar,
}: {
  recurso: Recurso;
  celda: Celda;
  esSocio: boolean;
  onCerrar: () => void;
}) {
  const [state, formAction] = useActionState(reservarTurno, initialState);
  const reservado = state !== initialState && state.error === null;

  const precio = esSocio ? recurso.precio_socio : recurso.precio_no_socio;
  const precioOtro = esSocio ? recurso.precio_no_socio : recurso.precio_socio;

  if (reservado) {
    // No se cierra solo: se queda un momento para ofrecer el
    // recordatorio de turno por push — el momento con más intención
    // real para pedir el permiso, no al abrir la app.
    return (
      <div className="sticky bottom-4 z-20 mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4 shadow-lg">
        <div>
          <p className="font-medium">Turno reservado.</p>
          <p className="text-sm text-muted-foreground">
            {recurso.nombre} · {formatearHoraLocal(celda.inicio)}–{formatearHoraLocal(celda.fin)}
          </p>
          <PedirPermisoPush mensaje="Avisame antes de mi turno" className="mt-1" />
        </div>
        <button type="button" onClick={onCerrar} className="text-sm text-muted-foreground hover:underline">
          Listo
        </button>
      </div>
    );
  }

  return (
    <div className="sticky bottom-4 z-20 mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-card p-4 shadow-lg">
      <div>
        <p className="font-medium">
          {recurso.nombre} · {formatearHoraLocal(celda.inicio)}–{formatearHoraLocal(celda.fin)}
        </p>
        <p className="text-sm">
          <span className="font-mono text-base font-semibold text-primary">${precio}</span>{' '}
          <span className="text-muted-foreground line-through">${precioOtro}</span>{' '}
          <span className="text-xs text-muted-foreground">{esSocio ? 'precio de socio' : 'precio general'}</span>
        </p>
        {state.error && <p className="mt-1 text-xs text-destructive">{state.error}</p>}
      </div>
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="recurso_id" value={recurso.id} />
        <input type="hidden" name="inicio" value={celda.inicio} />
        <input type="hidden" name="fin" value={celda.fin} />
        <button type="button" onClick={onCerrar} className="text-sm text-muted-foreground hover:underline">
          Cancelar
        </button>
        <SubmitButton pendingText="Reservando..." size="sm" className="w-auto">
          Confirmar
        </SubmitButton>
      </form>
    </div>
  );
}

export function ReservaGrid({
  recursos,
  filas,
  esSocio,
}: {
  recursos: Recurso[];
  filas: Fila[];
  esSocio: boolean;
}) {
  const [seleccion, setSeleccion] = useState<{ recursoId: string; celda: Celda } | null>(null);
  const recursoSeleccionado = seleccion ? recursos.find((r) => r.id === seleccion.recursoId) : undefined;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b bg-card px-3 py-2 text-left font-mono text-xs text-muted-foreground uppercase">
                Hora
              </th>
              {recursos.map((r) => (
                <th
                  key={r.id}
                  className="min-w-[110px] border-b border-l px-3 py-2 text-left font-medium whitespace-nowrap"
                >
                  {r.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.horaLabel}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-b bg-card px-3 py-2 text-left font-mono text-xs text-muted-foreground"
                >
                  {fila.horaLabel}
                </th>
                {recursos.map((r) => {
                  const celda = fila.celdas[r.id];
                  if (!celda) {
                    return (
                      <td
                        key={r.id}
                        className="border-b border-l px-3 py-2 text-center text-muted-foreground/30"
                      >
                        —
                      </td>
                    );
                  }
                  const precio = esSocio ? r.precio_socio : r.precio_no_socio;
                  return (
                    <td key={r.id} className="border-b border-l p-1">
                      <button
                        type="button"
                        disabled={celda.estado !== 'libre'}
                        onClick={() => setSeleccion({ recursoId: r.id, celda })}
                        className={cn(
                          'w-full rounded-md border px-2 py-2 text-xs font-medium transition-colors',
                          ESTILO_CELDA[celda.estado],
                        )}
                      >
                        {celda.estado === 'libre' ? `$${precio}` : LABEL_ESTADO[celda.estado]}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={recursos.length + 1} className="p-6 text-center text-sm text-muted-foreground">
                  No hay horarios configurados para este día.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-primary/40 bg-card" /> Libre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-primary/20 ring-1 ring-primary" /> Tuyo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-muted" /> Ocupado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-ink/[0.08]" /> Bloqueado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-dashed border-muted-foreground/30" /> Pasó
        </span>
      </div>

      {seleccion && recursoSeleccionado && (
        <ConfirmarReserva
          recurso={recursoSeleccionado}
          celda={seleccion.celda}
          esSocio={esSocio}
          onCerrar={() => setSeleccion(null)}
        />
      )}
    </div>
  );
}
