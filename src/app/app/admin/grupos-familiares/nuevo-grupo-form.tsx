'use client';

import { useActionState, useRef } from 'react';
import { crearGrupo, type GrupoState } from '@/lib/admin/grupos-familiares';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: GrupoState = { error: null };

export function NuevoGrupoForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (prev: GrupoState, fd: FormData) => {
    const result = await crearGrupo(prev, fd);
    if (!result.error) formRef.current?.reset();
    return result;
  }, initialState);

  return (
    <form ref={formRef} action={formAction} className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1">
        <Label htmlFor="nombre">Nombre del grupo</Label>
        <Input id="nombre" name="nombre" required placeholder="Familia Pérez" />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton pendingText="Creando..." className="w-auto">
        Crear grupo
      </SubmitButton>
    </form>
  );
}
