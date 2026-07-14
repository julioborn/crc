'use client';

import { useActionState, useRef } from 'react';
import { registrarEgreso, type EgresoState } from '@/lib/admin/egresos';
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

const initialState: EgresoState = { error: null };

export function NuevoEgresoForm({
  areas,
  puedeClub,
}: {
  areas: { id: string; nombre: string }[];
  puedeClub: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (prev: EgresoState, fd: FormData) => {
    const result = await registrarEgreso(prev, fd);
    if (!result.error) formRef.current?.reset();
    return result;
  }, initialState);

  return (
    <form ref={formRef} action={formAction} className="space-y-4 rounded-lg border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="area_id">Imputado a</Label>
          <Select name="area_id" required defaultValue={puedeClub ? 'club' : areas[0]?.id}>
            <SelectTrigger id="area_id" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {puedeClub && <SelectItem value="club">Del club (sin área)</SelectItem>}
              {areas.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="monto">Monto</Label>
          <Input id="monto" name="monto" type="number" min="0" step="0.01" required />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="concepto">Concepto</Label>
        <Input id="concepto" name="concepto" required placeholder="Pelotas de básquet, luz, ..." />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="fecha">Fecha</Label>
          <Input
            id="fecha"
            name="fecha"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="comprobante_url">Comprobante (opcional)</Label>
          <Input id="comprobante_url" name="comprobante_url" placeholder="Link al comprobante" />
        </div>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton pendingText="Registrando..." className="w-auto">
        Registrar egreso
      </SubmitButton>
    </form>
  );
}
