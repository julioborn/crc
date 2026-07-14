'use client';

import { useActionState } from 'react';
import { crearBloqueo, type BloqueoState } from '@/lib/admin/bloqueos';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';

const initialState: BloqueoState = { error: null };

export function BloqueoForm({ recursoId }: { recursoId: string }) {
  const [state, formAction] = useActionState(crearBloqueo.bind(null, recursoId), initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input
        type="datetime-local"
        name="desde"
        required
        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
      />
      <input
        type="datetime-local"
        name="hasta"
        required
        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
      />
      <Input name="motivo" placeholder="Motivo (torneo, mantenimiento...)" className="w-56" />
      <SubmitButton pendingText="Bloqueando..." size="sm" className="w-auto">
        Bloquear
      </SubmitButton>
      {state.error && <p className="w-full text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
