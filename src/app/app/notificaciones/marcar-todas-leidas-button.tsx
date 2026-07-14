'use client';

import { marcarTodasLeidas } from '@/lib/notificaciones/notificaciones';
import { Button } from '@/components/ui/button';

export function MarcarTodasLeidasButton() {
  return (
    <form action={marcarTodasLeidas}>
      <Button type="submit" size="sm" variant="ghost" className="w-auto">
        Marcar todas leídas
      </Button>
    </form>
  );
}
