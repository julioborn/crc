'use client';

import { useActionState, useRef, useState } from 'react';
import { crearArancel, type ArancelState } from '@/lib/admin/aranceles';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const initialState: ArancelState = { error: null };

const TIPOS = [
  { value: 'social', label: 'Social (socio individual)' },
  { value: 'social_familiar', label: 'Social familiar (tarifa plana por grupo)' },
  { value: 'actividad', label: 'Actividad (por área)' },
];

export function NuevoArancelForm({ areas }: { areas: { id: string; nombre: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [tipo, setTipo] = useState('');
  const [state, formAction] = useActionState(async (prev: ArancelState, fd: FormData) => {
    const result = await crearArancel(prev, fd);
    if (!result.error) {
      formRef.current?.reset();
      setTipo('');
    }
    return result;
  }, initialState);

  return (
    <form ref={formRef} action={formAction} className="space-y-4 rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">
        Un arancel nunca se edita: esto cierra el vigente (le pone la fecha de
        ayer como <code>vigente_hasta</code>) y crea uno nuevo. El histórico
        queda intacto.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="tipo">Tipo</Label>
          <Select name="tipo" required value={tipo} onValueChange={setTipo}>
            <SelectTrigger id="tipo" className="w-full">
              <SelectValue placeholder="Elegí un tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {tipo === 'actividad' && (
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
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="monto">Monto</Label>
          <Input id="monto" name="monto" type="number" min="0" step="0.01" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vigente_desde">Vigente desde</Label>
          <Input
            id="vigente_desde"
            name="vigente_desde"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton pendingText="Guardando..." className="w-auto">
        Cerrar vigente y crear
      </SubmitButton>
    </form>
  );
}
