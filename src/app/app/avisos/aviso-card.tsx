'use client';

import { useActionState, useState } from 'react';
import { editarAviso, borrarAviso, marcarAvisoLeido, type AvisoState } from '@/lib/notificaciones/avisos';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ItemCard } from '@/components/admin/kit';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const initialState: AvisoState = { error: null };

export type Aviso = {
  id: string;
  titulo: string;
  cuerpo: string;
  alcance: 'global' | 'area';
  area: { nombre: string } | null;
  imagen_url: string | null;
  created_at: string;
  usuario_id: string;
};

export function AvisoCard({
  aviso,
  leido,
  puedeEditar,
  esActual,
  fechaLabel,
}: {
  aviso: Aviso;
  leido: boolean;
  puedeEditar: boolean;
  esActual: boolean;
  fechaLabel: string;
}) {
  const [editando, setEditando] = useState(false);
  const [state, formAction] = useActionState(editarAviso.bind(null, aviso.id), initialState);

  if (editando) {
    return (
      <ItemCard>
        <form
          action={async (fd) => {
            await formAction(fd);
            setEditando(false);
          }}
          className="space-y-3"
        >
          <Input name="titulo" defaultValue={aviso.titulo} required />
          <Textarea name="cuerpo" defaultValue={aviso.cuerpo} required rows={3} />
          <Input name="imagen_url" defaultValue={aviso.imagen_url ?? ''} placeholder="Link a una imagen (opcional)" />
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex gap-2">
            <SubmitButton pendingText="Guardando..." size="sm" className="w-auto">
              Guardar
            </SubmitButton>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </ItemCard>
    );
  }

  return (
    <ItemCard
      id={`aviso-${aviso.id}`}
      className={cn(esActual && 'border-primary/50 bg-primary/[0.03]')}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-lg font-semibold">{aviso.titulo}</p>
            <Badge variant={aviso.alcance === 'global' ? 'default' : 'secondary'}>
              {aviso.alcance === 'global' ? 'Global' : aviso.area?.nombre}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{fechaLabel}</p>
        </div>
        {puedeEditar && (
          <div className="flex gap-1">
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditando(true)}>
              <Pencil className="size-3.5" />
            </Button>
            <form action={borrarAviso.bind(null, aviso.id)}>
              <Button type="submit" size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                <Trash2 className="size-3.5" />
              </Button>
            </form>
          </div>
        )}
      </div>

      {aviso.imagen_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={aviso.imagen_url} alt="" className="max-h-64 w-full rounded-md object-cover" />
      )}

      <p className="text-sm whitespace-pre-wrap">{aviso.cuerpo}</p>

      {leido ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="size-3.5" /> Leído
        </p>
      ) : (
        <form action={marcarAvisoLeido.bind(null, aviso.id)}>
          <Button type="submit" size="sm" variant="outline" className="w-auto">
            Marcar leído
          </Button>
        </form>
      )}
    </ItemCard>
  );
}
