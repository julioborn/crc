'use client';

import { useActionState } from 'react';
import { cancelarTurno, type CancelarState } from '@/lib/reservas/cancelar';
import { SubmitButton } from '@/components/submit-button';

const initialState: CancelarState = { error: null };

export function CancelarButton({ turnoId }: { turnoId: string }) {
  const [state, formAction] = useActionState(cancelarTurno, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="turno_id" value={turnoId} />
      <SubmitButton pendingText="Cancelando..." variant="outline" size="sm" className="w-auto">
        Cancelar
      </SubmitButton>
      {state.error && <p className="max-w-xs text-right text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
