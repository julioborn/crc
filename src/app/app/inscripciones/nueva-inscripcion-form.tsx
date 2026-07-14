'use client';

import { useActionState, useRef } from 'react';
import { inscribirSocio, type InscripcionState } from '@/lib/admin/inscripciones';
import { SubmitButton } from '@/components/submit-button';
import { SocioPicker } from '@/components/admin/socio-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const initialState: InscripcionState = { error: null };

export function NuevaInscripcionForm({ areas }: { areas: { id: string; nombre: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (prev: InscripcionState, fd: FormData) => {
    const result = await inscribirSocio(prev, fd);
    if (!result.error) formRef.current?.reset();
    return result;
  }, initialState);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-1">
        <Label>Socio</Label>
        <SocioPicker />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
        <div className="space-y-1">
          <Label htmlFor="fecha_alta">Fecha de alta</Label>
          <Input
            id="fecha_alta"
            name="fecha_alta"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton pendingText="Inscribiendo..." className="w-auto">
        Inscribir
      </SubmitButton>
    </form>
  );
}
