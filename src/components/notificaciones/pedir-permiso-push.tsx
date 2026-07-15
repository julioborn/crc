'use client';

import { useState } from 'react';
import { Bell, Check, Share } from 'lucide-react';
import { pedirPermisoYRegistrar, esIOSNoInstalada } from '@/lib/firebase/client';
import { registrarDispositivo } from '@/lib/notificaciones/dispositivo';
import { cn } from '@/lib/utils';

/**
 * El permiso de notificaciones se pide EN ESTE botón, en un momento con
 * intención real (ej: justo después de reservar un turno) — nunca
 * automáticamente al abrir la app. Si el usuario dice que no, o el
 * navegador no soporta push por una razón sin solución (denegado a
 * nivel sistema), el botón desaparece sin insistir. Pero si el motivo
 * tiene arreglo (iPhone sin agregar a inicio), se lo explicamos en vez
 * de desaparecer en silencio.
 */
export function PedirPermisoPush({ mensaje, className }: { mensaje: string; className?: string }) {
  const [estado, setEstado] = useState<'idle' | 'pidiendo' | 'ok' | 'oculto' | 'ios_no_instalada'>('idle');

  if (estado === 'oculto') return null;

  if (estado === 'ok') {
    return (
      <p className={cn('flex items-center gap-1.5 text-sm text-primary', className)}>
        <Check className="size-3.5" /> Listo, te vamos a avisar.
      </p>
    );
  }

  if (estado === 'ios_no_instalada') {
    return (
      <p className={cn('flex items-start gap-1.5 text-sm text-muted-foreground', className)}>
        <Share className="mt-0.5 size-3.5 shrink-0" />
        En iPhone las notificaciones solo llegan si agregás esta página a tu pantalla de inicio:
        tocá <strong>Compartir</strong> y elegí <strong>&quot;Agregar a inicio&quot;</strong>, después
        abrí la app desde ahí.
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={estado === 'pidiendo'}
      onClick={async () => {
        if (esIOSNoInstalada()) {
          setEstado('ios_no_instalada');
          return;
        }
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
