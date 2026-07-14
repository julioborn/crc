'use client';

import { useActionState, useRef } from 'react';
import { crearComision, type ComisionState } from '@/lib/admin/comisiones';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const initialState: ComisionState = { error: null };

export function NuevaComisionForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (prev: ComisionState, fd: FormData) => {
    const result = await crearComision(prev, fd);
    if (!result.error) formRef.current?.reset();
    return result;
  }, initialState);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" required placeholder="Subcomisión de Básquet" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="mandato_desde">Mandato desde</Label>
          <Input id="mandato_desde" name="mandato_desde" type="date" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mandato_hasta">Mandato hasta</Label>
          <Input id="mandato_hasta" name="mandato_hasta" type="date" required />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="es_directiva" />
        Es la Comisión Directiva General (alcance global, por encima de las áreas)
      </label>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton pendingText="Creando..." className="w-auto">
        Crear comisión
      </SubmitButton>
    </form>
  );
}
