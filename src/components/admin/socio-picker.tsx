'use client';

import { useState, useTransition } from 'react';
import { buscarSocios } from '@/lib/admin/usuarios';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Socio = {
  id: string;
  numero_socio: number;
  usuario: { nombre: string; apellido: string } | null;
};

export function SocioPicker({ name = 'socio_id' }: { name?: string }) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Socio[]>([]);
  const [seleccionado, setSeleccionado] = useState<Socio | null>(null);
  const [buscado, setBuscado] = useState(false);
  const [pending, startTransition] = useTransition();

  function buscar() {
    startTransition(async () => {
      const data = await buscarSocios(query);
      setResultados(data);
      setBuscado(true);
    });
  }

  if (seleccionado) {
    return (
      <div className="flex items-center justify-between rounded-md border p-3">
        <p className="text-sm font-medium">
          #{seleccionado.numero_socio} {seleccionado.usuario?.nombre}{' '}
          {seleccionado.usuario?.apellido}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setSeleccionado(null);
            setBuscado(false);
          }}
        >
          Cambiar
        </Button>
        <input type="hidden" name={name} value={seleccionado.id} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Buscar por nombre, apellido o número de socio..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              buscar();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={buscar} disabled={pending}>
          {pending ? 'Buscando...' : 'Buscar'}
        </Button>
      </div>
      {resultados.length > 0 && (
        <ul className="divide-y rounded-md border">
          {resultados.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSeleccionado(s)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
              >
                #{s.numero_socio} {s.usuario?.nombre} {s.usuario?.apellido}
              </button>
            </li>
          ))}
        </ul>
      )}
      {buscado && !pending && resultados.length === 0 && (
        <p className="text-sm text-muted-foreground">Sin resultados.</p>
      )}
    </div>
  );
}
