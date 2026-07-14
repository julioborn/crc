'use client';

import { useActionState } from 'react';
import { cobrarTurno, type CobroTurnoState } from '@/lib/admin/panel-turnos';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const initialState: CobroTurnoState = { error: null };

export function CobrarTurnoForm({ turnoId }: { turnoId: string }) {
  const [state, formAction] = useActionState(cobrarTurno, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="turno_id" value={turnoId} />
      <Select name="metodo" required defaultValue="efectivo">
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="efectivo">Efectivo</SelectItem>
          <SelectItem value="transferencia">Transferencia</SelectItem>
        </SelectContent>
      </Select>
      <Input name="comprobante_url" placeholder="Comprobante (opcional)" className="w-44" />
      <SubmitButton pendingText="Cobrando..." size="sm" className="w-auto">
        Cobrar
      </SubmitButton>
      {state.error && <p className="w-full text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
