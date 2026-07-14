'use client';

import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';

export function SelectorFecha({ areaId, fecha }: { areaId: string; fecha: string }) {
  const router = useRouter();

  return (
    <label className="relative flex w-auto items-center">
      <CalendarDays className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
      <input
        type="date"
        value={fecha}
        onChange={(e) => {
          if (e.target.value) router.push(`/app/reservar?area_id=${areaId}&fecha=${e.target.value}`);
        }}
        aria-label="Elegir fecha"
        className="h-9 rounded-md border border-input bg-transparent py-1 pr-2 pl-8 text-sm"
      />
    </label>
  );
}
