'use client';

import { useActionState, useState } from 'react';
import { agregarDisponibilidad, type DisponibilidadState } from '@/lib/admin/disponibilidad';
import { SubmitButton } from '@/components/submit-button';
import { cn } from '@/lib/utils';

const initialState: DisponibilidadState = { error: null };

const DIAS_CORTO = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const DIAS_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const TODOS = [0, 1, 2, 3, 4, 5, 6];

export function DisponibilidadForm({ recursoId }: { recursoId: string }) {
  const [state, formAction] = useActionState(
    agregarDisponibilidad.bind(null, recursoId),
    initialState,
  );
  const [dias, setDias] = useState<number[]>([]);

  const todosSeleccionados = dias.length === 7;

  function toggleDia(d: number) {
    setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  function toggleTodos() {
    setDias(todosSeleccionados ? [] : TODOS);
  }

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={toggleTodos}
          className={cn(
            'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
            todosSeleccionados
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input hover:border-primary/40',
          )}
        >
          Todos los días
        </button>
        <div className="flex gap-1">
          {DIAS_CORTO.map((label, i) => (
            <button
              key={i}
              type="button"
              title={DIAS_LARGO[i]}
              onClick={() => toggleDia(i)}
              aria-pressed={dias.includes(i)}
              className={cn(
                'flex size-8 items-center justify-center rounded-md border text-xs font-semibold transition-colors',
                dias.includes(i)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input hover:border-primary/40',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {dias.map((d) => (
          <input key={d} type="hidden" name="dias" value={d} />
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <input
          type="time"
          name="hora_desde"
          required
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        />
        <span className="text-sm text-muted-foreground">a</span>
        <input
          type="time"
          name="hora_hasta"
          required
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        />
        <SubmitButton pendingText="Agregando..." size="sm" className="w-auto">
          Agregar franja
        </SubmitButton>
      </div>

      <p className="text-xs text-muted-foreground">
        Si el horario &quot;hasta&quot; es más temprano que el &quot;desde&quot;, se entiende que
        cruza la medianoche (ej: 20:00 a 02:00).
      </p>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
