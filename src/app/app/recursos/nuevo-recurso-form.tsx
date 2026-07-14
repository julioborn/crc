'use client';

import { useActionState, useRef } from 'react';
import { crearRecurso, type RecursoState } from '@/lib/admin/recursos';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const initialState: RecursoState = { error: null };

export function NuevoRecursoForm({ areas }: { areas: { id: string; nombre: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (prev: RecursoState, fd: FormData) => {
    const result = await crearRecurso(prev, fd);
    if (!result.error) formRef.current?.reset();
    return result;
  }, initialState);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" required placeholder="Cancha de pádel 1" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="area_id">Área</Label>
          <Select name="area_id" required>
            <SelectTrigger id="area_id" className="w-full">
              <SelectValue placeholder="Elegí un área" />
            </SelectTrigger>
            <SelectContent>
              {areas.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="precio_socio">Precio socio</Label>
          <Input id="precio_socio" name="precio_socio" type="number" min="0" step="0.01" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="precio_no_socio">Precio no socio</Label>
          <Input
            id="precio_no_socio"
            name="precio_no_socio"
            type="number"
            min="0"
            step="0.01"
            required
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="duracion_minutos">Duración (minutos)</Label>
          <Input
            id="duracion_minutos"
            name="duracion_minutos"
            type="number"
            min="15"
            step="15"
            defaultValue={60}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="horas_cancelacion">Horas para poder cancelar</Label>
          <Input
            id="horas_cancelacion"
            name="horas_cancelacion"
            type="number"
            min="0"
            defaultValue={1}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="aprobacion_automatica" defaultChecked />
        Aprobación automática (si no, cada reserva queda pendiente hasta que
        alguien la confirme)
      </label>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton pendingText="Creando..." className="w-auto">
        Crear recurso
      </SubmitButton>
    </form>
  );
}
