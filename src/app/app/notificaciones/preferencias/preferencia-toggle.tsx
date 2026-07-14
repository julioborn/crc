'use client';

import { useState, useTransition } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { actualizarPreferencia } from '@/lib/notificaciones/preferencias';
import type { Categoria } from '@/lib/notificaciones/categorias';

export function PreferenciaToggle({
  categoria,
  habilitadaInicial,
  label,
  descripcion,
}: {
  categoria: Categoria;
  habilitadaInicial: boolean;
  label: string;
  descripcion?: string;
}) {
  const [habilitada, setHabilitada] = useState(habilitadaInicial);
  const [, startTransition] = useTransition();

  return (
    <label className="flex items-start gap-3 rounded-xl border p-4">
      <Checkbox
        checked={habilitada}
        onCheckedChange={(valor) => {
          const nuevo = valor === true;
          setHabilitada(nuevo);
          startTransition(() => {
            actualizarPreferencia(categoria, nuevo);
          });
        }}
      />
      <div>
        <p className="text-sm font-medium">{label}</p>
        {descripcion && <p className="text-xs text-muted-foreground">{descripcion}</p>}
      </div>
    </label>
  );
}
