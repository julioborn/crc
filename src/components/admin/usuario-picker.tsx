'use client';

import { useState, useTransition } from 'react';
import { buscarUsuarios } from '@/lib/admin/usuarios';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

type Usuario = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  email: string | null;
};

type Props = {
  name?: string;
  excluirIds?: string[];
  onSeleccionar?: (usuario: Usuario) => void;
  /**
   * Alta de socio: el mail es el canal del link de pago y del recibo. Un
   * mail mal escrito en el registro es un socio que no puede pagar — así
   * que antes de confirmar el alta, la administración tiene que mirarlo
   * y decir explícitamente que está bien.
   */
  confirmarEmail?: boolean;
};

/**
 * Buscador de usuarios existentes, para elegir a quién asignarle un cargo
 * o a quién dar de alta como socio. No crea usuarios — eso solo pasa por
 * autorregistro (ver Fase 0). Deja un <input type="hidden"> con el id
 * elegido para que el <form> que lo contiene lo mande como cualquier otro
 * campo.
 */
export function UsuarioPicker({
  name = 'usuario_id',
  excluirIds = [],
  onSeleccionar,
  confirmarEmail = false,
}: Props) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Usuario[]>([]);
  const [seleccionado, setSeleccionado] = useState<Usuario | null>(null);
  const [buscado, setBuscado] = useState(false);
  const [pending, startTransition] = useTransition();

  function buscar() {
    startTransition(async () => {
      const data = await buscarUsuarios(query);
      setResultados(data.filter((u) => !excluirIds.includes(u.id)));
      setBuscado(true);
    });
  }

  function elegir(u: Usuario) {
    setSeleccionado(u);
    onSeleccionar?.(u);
  }

  if (seleccionado) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">
              {seleccionado.nombre} {seleccionado.apellido}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {seleccionado.email ?? 'sin email'}
              {seleccionado.dni ? ` · DNI ${seleccionado.dni}` : ''}
            </p>
          </div>
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

        {confirmarEmail && (
          <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm">
              El mail de este socio va a ser el canal del link de pago y del
              recibo:{' '}
              <span className="font-mono font-medium">
                {seleccionado.email ?? '(no tiene mail cargado)'}
              </span>
            </p>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="email_confirmado" required />
              Confirmo que el mail de arriba es correcto
            </label>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Buscar por nombre, apellido, DNI o email..."
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
          {resultados.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => elegir(u)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span>
                  {u.nombre} {u.apellido}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{u.email}</span>
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
