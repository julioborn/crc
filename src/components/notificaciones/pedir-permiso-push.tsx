'use client';

import { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { pedirPermisoYRegistrar } from '@/lib/firebase/client';
import { registrarDispositivo } from '@/lib/notificaciones/dispositivo';
import { cn } from '@/lib/utils';

/**
 * El permiso de notificaciones se pide EN ESTE botón, en un momento con
 * intención real (ej: justo después de reservar un turno) — nunca
 * automáticamente al abrir la app. Si el usuario dice que no, o el
 * navegador no soporta push, el botón desaparece sin insistir.
 */
export function PedirPermisoPush({ mensaje, className }: { mensaje: string; className?: string }) {
  const [estado, setEstado] = useState<'idle' | 'pidiendo' | 'ok' | 'oculto'>('idle');

  if (estado === 'oculto') return null;

  if (estado === 'ok') {
    return (
      <p className={cn('flex items-center gap-1.5 text-sm text-primary', className)}>
        <Check className="size-3.5" /> Listo, te vamos a avisar.
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={estado === 'pidiendo'}
      onClick={async () => {
        setEstado('pidiendo');
        const resultado = await pedirPermisoYRegistrar(registrarDispositivo);
        setEstado(resultado === 'concedido' ? 'ok' : 'oculto');
      }}
      className={cn(
        'flex items-center gap-1.5 text-sm text-primary hover:underline disabled:opacity-50',
        className,
      )}
    >
      <Bell className="size-3.5" />
      {estado === 'pidiendo' ? 'Pidiendo permiso...' : mensaje}
    </button>
  );
}
