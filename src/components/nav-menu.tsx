'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const GENERAL_LINKS = [
  { href: '/app/mis-cuotas', label: 'Mis cuotas' },
  { href: '/app/reservar', label: 'Reservar' },
  { href: '/app/mis-turnos', label: 'Mis turnos' },
  { href: '/app/avisos', label: 'Avisos' },
  { href: '/app/notificaciones', label: 'Notificaciones' },
];

const GESTION_LINKS = [
  { href: '/app/inscripciones', label: 'Inscripciones' },
  { href: '/app/cobros', label: 'Cobros' },
  { href: '/app/egresos', label: 'Egresos' },
  { href: '/app/reportes', label: 'Reportes' },
  { href: '/app/recursos', label: 'Recursos' },
  { href: '/app/panel-turnos', label: 'Panel de turnos' },
];

const ADMIN_LINKS = [
  { href: '/app/admin/areas', label: 'Áreas' },
  { href: '/app/admin/comisiones', label: 'Comisiones' },
  { href: '/app/admin/cargos', label: 'Cargos' },
  { href: '/app/admin/socios', label: 'Socios' },
  { href: '/app/admin/grupos-familiares', label: 'Grupos familiares' },
  { href: '/app/admin/aranceles', label: 'Aranceles' },
];

/**
 * El home ya es la pantalla — esto es navegación SECUNDARIA, para llegar
 * a lo que no tiene tarjeta propia ahí. Antes esto era una fila de links
 * sueltos en el header; con la CD viendo Administración + Gestión +
 * General juntos, desbordaba el header entero.
 */
export function NavMenu({
  esDirectiva,
  mostrarGestion,
}: {
  esDirectiva: boolean;
  mostrarGestion: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md border border-paper/20 px-2.5 py-1.5 text-sm text-paper/90 transition-colors hover:border-paper/40 hover:bg-paper/10">
        <Menu className="size-4" />
        <span className="hidden sm:inline">Menú</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>General</DropdownMenuLabel>
        {GENERAL_LINKS.map((l) => (
          <DropdownMenuItem key={l.href} asChild>
            <Link href={l.href}>{l.label}</Link>
          </DropdownMenuItem>
        ))}

        {mostrarGestion && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Gestión</DropdownMenuLabel>
            {GESTION_LINKS.map((l) => (
              <DropdownMenuItem key={l.href} asChild>
                <Link href={l.href}>{l.label}</Link>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {esDirectiva && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Administración</DropdownMenuLabel>
            {ADMIN_LINKS.map((l) => (
              <DropdownMenuItem key={l.href} asChild>
                <Link href={l.href}>{l.label}</Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
