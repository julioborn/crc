'use client';

import { useActionState, useRef, useState } from 'react';
import { crearAviso, type AvisoState } from '@/lib/notificaciones/avisos';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const initialState: AvisoState = { error: null };

export function NuevoAvisoForm({
  esDirectiva,
  areas,
}: {
  esDirectiva: boolean;
  areas: { id: string; nombre: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [alcance, setAlcance] = useState<'global' | 'area'>(esDirectiva ? 'global' : 'area');
  const [state, formAction] = useActionState(async (prev: AvisoState, fd: FormData) => {
    const result = await crearAviso(prev, fd);
    if (!result.error) formRef.current?.reset();
    return result;
  }, initialState);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {esDirectiva && (
          <div className="space-y-1">
            <Label htmlFor="alcance">Alcance</Label>
            <Select name="alcance" value={alcance} onValueChange={(v) => setAlcance(v as 'global' | 'area')}>
              <SelectTrigger id="alcance" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global (todo el club)</SelectItem>
                <SelectItem value="area">Un área</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {!esDirectiva && <input type="hidden" name="alcance" value="area" />}

        {alcance === 'area' && (
          <div className="space-y-1">
            <Label htmlFor="area_id">Área</Label>
            <Select name="area_id" required defaultValue={areas.length === 1 ? areas[0].id : undefined}>
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

      <div className="space-y-1">
        <Label htmlFor="titulo">Título</Label>
        <Input id="titulo" name="titulo" required placeholder="Corte de agua el sábado" />
      </div>

      <div className="space-y-1">
        <Label htmlFor="cuerpo">Cuerpo</Label>
        <Textarea id="cuerpo" name="cuerpo" required rows={3} placeholder="Contá los detalles..." />
      </div>

      <div className="space-y-1">
        <Label htmlFor="imagen_url">Imagen (opcional)</Label>
        <Input id="imagen_url" name="imagen_url" placeholder="Link a una imagen" />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton pendingText="Publicando..." className="w-auto">
        Publicar aviso
      </SubmitButton>
    </form>
  );
}
