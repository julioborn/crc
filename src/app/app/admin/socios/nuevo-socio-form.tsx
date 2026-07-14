'use client';

import { useActionState, useRef } from 'react';
import { altaSocio, type SocioState } from '@/lib/admin/socios';
import { SubmitButton } from '@/components/submit-button';
import { UsuarioPicker } from '@/components/admin/usuario-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const initialState: SocioState = { error: null };

export function NuevoSocioForm({
  siguienteNumero,
  gruposFamiliares,
  usuarioIdsExistentes,
}: {
  siguienteNumero: number;
  gruposFamiliares: { id: string; nombre: string }[];
  usuarioIdsExistentes: string[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (prev: SocioState, fd: FormData) => {
    const result = await altaSocio(prev, fd);
    if (!result.error) formRef.current?.reset();
    return result;
  }, initialState);

  return (
    <form ref={formRef} action={formAction} className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <Label>Usuario</Label>
        <UsuarioPicker excluirIds={usuarioIdsExistentes} confirmarEmail />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="numero_socio">Número de socio</Label>
          <Input
            id="numero_socio"
            name="numero_socio"
            type="number"
            min={1}
            required
            defaultValue={siguienteNumero}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fecha_alta">Fecha de alta</Label>
          <Input
            id="fecha_alta"
            name="fecha_alta"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
          <p className="text-xs text-muted-foreground">
            Puede ser futura. La fecha de alta manda: paga el mes completo, sin
            prorrateo.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="grupo_familiar_id">Grupo familiar (opcional)</Label>
        <Select name="grupo_familiar_id" defaultValue="ninguno">
          <SelectTrigger id="grupo_familiar_id" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ninguno">Sin grupo familiar</SelectItem>
            {gruposFamiliares.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton pendingText="Dando de alta..." className="w-auto">
        Dar de alta
      </SubmitButton>
    </form>
  );
}
