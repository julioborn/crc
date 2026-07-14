'use client';

import Link from 'next/link';
import { Bell, Megaphone, Wallet, CalendarDays, CheckCircle } from 'lucide-react';
import { marcarNotificacionLeida } from '@/lib/notificaciones/notificaciones';
import { CATEGORIA_LABEL, type Categoria } from '@/lib/notificaciones/categorias';
import { cn } from '@/lib/utils';

const ICONO: Record<Categoria, React.ElementType> = {
  aviso: Megaphone,
  cuota_emitida: Wallet,
  cuota_por_vencer: Wallet,
  cuota_vencida: Wallet,
  turno_confirmado: CalendarDays,
  turno_rechazado: CalendarDays,
  recordatorio_turno: CalendarDays,
  pago_acreditado: CheckCircle,
};

export function NotificacionRow({
  id,
  categoria,
  titulo,
  cuerpo,
  deepLink,
  leida,
  fechaLabel,
}: {
  id: string;
  categoria: Categoria;
  titulo: string;
  cuerpo: string;
  deepLink: string | null;
  leida: boolean;
  fechaLabel: string;
}) {
  const Icono = ICONO[categoria] ?? Bell;

  const contenido = (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 transition-colors hover:border-primary/20',
        !leida && 'border-primary/25 bg-primary/[0.03]',
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          leida ? 'bg-ink/[0.06] text-muted-foreground' : 'bg-primary/15 text-primary',
        )}
      >
        <Icono className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">
            {CATEGORIA_LABEL[categoria]}
          </p>
          {!leida && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
        </div>
        <p className="text-sm font-medium">{titulo}</p>
        <p className="text-sm text-muted-foreground">{cuerpo}</p>
        <p className="text-xs text-muted-foreground">{fechaLabel}</p>
      </div>
    </div>
  );

  if (!deepLink) return contenido;

  return (
    <Link href={deepLink} onClick={() => marcarNotificacionLeida(id)}>
      {contenido}
    </Link>
  );
}
