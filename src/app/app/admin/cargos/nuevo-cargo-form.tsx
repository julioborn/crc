'use client';

import { useActionState, useRef } from 'react';
import { asignarCargo, type CargoState } from '@/lib/admin/cargos';
import { SubmitButton } from '@/components/submit-button';
import { UsuarioPicker } from '@/components/admin/usuario-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CARGO_LABEL } from '@/lib/auth/roles';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const initialState: CargoState = { error: null };

const CARGOS = Object.entries(CARGO_LABEL) as [keyof typeof CARGO_LABEL, string][];

export function NuevoCargoForm({
  comisiones,
}: {
  comisiones: { id: string; nombre: string; es_directiva: boolean }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (prev: CargoState, fd: FormData) => {
    const result = await asignarCargo(prev, fd);
    if (!result.error) formRef.current?.reset();
    return result;
  }, initialState);

  return (
    <form ref={formRef} action={formAction} className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <Label>Usuario</Label>
        <UsuarioPicker />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="comision_id">Comisión</Label>
          <Select name="comision_id" required>
            <SelectTrigger id="comision_id" className="w-full">
              <SelectValue placeholder="Elegí una comisión" />
            </SelectTrigger>
            <SelectContent>
              {comisiones.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                  {c.es_directiva ? ' (CD General)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cargo">Cargo</Label>
          <Select name="cargo" required>
            <SelectTrigger id="cargo" className="w-full">
              <SelectValue placeholder="Elegí un cargo" />
            </SelectTrigger>
            <SelectContent>
              {CARGOS.map(([valor, etiqueta]) => (
                <SelectItem key={valor} value={valor}>
                  {etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
        <div className="space-y-1">
          <Label htmlFor="vigente_hasta">Vigente hasta (opcional)</Label>
          <Input id="vigente_hasta" name="vigente_hasta" type="date" />
        </div>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton pendingText="Asignando..." className="w-auto">
        Asignar cargo
      </SubmitButton>
    </form>
  );
}
