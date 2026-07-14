'use client';

import { useActionState } from 'react';
import { agregarDisponibilidad, type DisponibilidadState } from '@/lib/admin/disponibilidad';
import { SubmitButton } from '@/components/submit-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const initialState: DisponibilidadState = { error: null };

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function DisponibilidadForm({ recursoId }: { recursoId: string }) {
  const [state, formAction] = useActionState(
    agregarDisponibilidad.bind(null, recursoId),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <Select name="dia_semana" required>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Día" />
        </SelectTrigger>
        <SelectContent>
          {DIAS.map((d, i) => (
            <SelectItem key={d} value={String(i)}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input
        type="time"
        name="hora_desde"
        required
        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
      />
      <input
        type="time"
        name="hora_hasta"
        required
        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
      />
      <SubmitButton pendingText="Agregando..." size="sm" className="w-auto">
        Agregar franja
      </SubmitButton>
      {state.error && <p className="w-full text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
