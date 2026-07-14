import Image from 'next/image';
import Link from 'next/link';
import { club } from '@/config/club';
import { logout } from '@/lib/auth/actions';
import { cn } from '@/lib/utils';

type Props = {
  nombreCompleto: string;
  esDirectiva: boolean;
  cargos: { etiqueta: string; esDirectiva: boolean }[];
  tieneAreasGestionadas: boolean;
};

function CredentialPill({
  children,
  highlight,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <span
      className={cn(
        'rounded-full border px-2.5 py-1 font-mono text-[0.65rem] tracking-[0.12em] uppercase',
        highlight ? 'border-primary/40 bg-primary/15 text-primary' : 'border-paper/25 text-paper/75',
      )}
    >
      {children}
    </span>
  );
}

const ADMIN_LINKS = [
  { href: '/app/admin/areas', label: 'Áreas' },
  { href: '/app/admin/comisiones', label: 'Comisiones' },
  { href: '/app/admin/cargos', label: 'Cargos' },
  { href: '/app/admin/socios', label: 'Socios' },
  { href: '/app/admin/grupos-familiares', label: 'Grupos familiares' },
  { href: '/app/admin/aranceles', label: 'Aranceles' },
];

const GESTION_LINKS = [
  { href: '/app/inscripciones', label: 'Inscripciones' },
  { href: '/app/cobros', label: 'Cobros' },
  { href: '/app/egresos', label: 'Egresos' },
  { href: '/app/reportes', label: 'Reportes' },
];

function NavLinks({ esDirectiva, mostrarGestion, className }: { esDirectiva: boolean; mostrarGestion: boolean; className: string }) {
  return (
    <nav className={className}>
      <Link href="/app/mis-cuotas" className="hover:text-paper">
        Mis cuotas
      </Link>
      {esDirectiva &&
        ADMIN_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-paper">
            {link.label}
          </Link>
        ))}
      {mostrarGestion &&
        GESTION_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-paper">
            {link.label}
          </Link>
        ))}
    </nav>
  );
}

export function AppNav({ nombreCompleto, esDirectiva, cargos, tieneAreasGestionadas }: Props) {
  const mostrarGestion = esDirectiva || tieneAreasGestionadas;

  return (
    <header className="flex flex-col gap-2 bg-ink px-4 py-3 text-paper sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/app" className="flex items-center gap-2.5">
            <Image src={club.logo} alt="" width={28} height={28} className="rounded" />
            <span className="font-display text-lg font-bold tracking-wide uppercase">
              {club.nombreCorto}
            </span>
          </Link>

          <NavLinks
            esDirectiva={esDirectiva}
            mostrarGestion={mostrarGestion}
            className="hidden items-center gap-4 font-mono text-xs tracking-wide text-paper/75 uppercase md:flex"
          />
        </div>

        <div className="flex items-center gap-3">
          {esDirectiva && <CredentialPill highlight>Comisión Directiva</CredentialPill>}
          {!esDirectiva &&
            cargos.map((c) => <CredentialPill key={c.etiqueta}>{c.etiqueta}</CredentialPill>)}

          <span className="hidden text-sm text-paper/70 sm:inline">{nombreCompleto}</span>

          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-paper/20 px-3 py-1.5 text-sm text-paper/90 transition-colors hover:border-paper/40 hover:bg-paper/10"
            >
              Salir
            </button>
          </form>
        </div>
      </div>

      <NavLinks
        esDirectiva={esDirectiva}
        mostrarGestion={mostrarGestion}
        className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs tracking-wide text-paper/75 uppercase md:hidden"
      />
    </header>
  );
}
