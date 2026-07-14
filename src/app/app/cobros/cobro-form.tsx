'use client';

import { useActionState } from 'react';
import { registrarCobroPresencial, type CobroState } from '@/lib/admin/cobros';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const initialState: CobroState = { error: null };

export function CobroForm({ cuotaId }: { cuotaId: string }) {
  const [state, formAction] = useActionState(registrarCobroPresencial, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="cuota_id" value={cuotaId} />
      <Select name="metodo" required defaultValue="efectivo">
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="efectivo">Efectivo</SelectItem>
          <SelectItem value="transferencia">Transferencia</SelectItem>
        </SelectContent>
      </Select>
      <Input name="comprobante_url" placeholder="Link al comprobante (opcional)" className="w-56" />
      <SubmitButton pendingText="Registrando..." size="sm" className="w-auto">
        Cobrar
      </SubmitButton>
      {state.error && <p className="w-full text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
