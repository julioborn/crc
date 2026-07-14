'use client';

import { useActionState, useRef } from 'react';
import { crearArea, type AreaState } from '@/lib/admin/areas';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const initialState: AreaState = { error: null };

export function NuevaAreaForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (prev: AreaState, fd: FormData) => {
    const result = await crearArea(prev, fd);
    if (!result.error) formRef.current?.reset();
    return result;
  }, initialState);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="descripcion">Descripción</Label>
          <Input id="descripcion" name="descripcion" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="es_inscribible" />
        Es inscribible (los socios se anotan a una actividad de esta área)
      </label>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton pendingText="Creando..." className="w-auto">
        Crear área
      </SubmitButton>
    </form>
  );
}
