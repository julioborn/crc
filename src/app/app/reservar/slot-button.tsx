'use client';

import { useActionState } from 'react';
import { reservarTurno, type ReservaState } from '@/lib/reservas/actions';
import { SubmitButton } from '@/components/submit-button';

const initialState: ReservaState = { error: null };

export function SlotButton({
  recursoId,
  inicio,
  fin,
  horaLabel,
}: {
  recursoId: string;
  inicio: string;
  fin: string;
  horaLabel: string;
}) {
  const [state, formAction] = useActionState(reservarTurno, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="recurso_id" value={recursoId} />
      <input type="hidden" name="inicio" value={inicio} />
      <input type="hidden" name="fin" value={fin} />
      <SubmitButton pendingText="Reservando..." variant="outline" size="sm" className="w-auto">
        {horaLabel}
      </SubmitButton>
      {state.error && <p className="max-w-[10rem] text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
