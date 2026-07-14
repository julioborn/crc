import Image from 'next/image';
import Link from 'next/link';
import { club } from '@/config/club';
import { logout } from '@/lib/auth/actions';
import { cn } from '@/lib/utils';

type Props = {
  nombreCompleto: string;
  esDirectiva: boolean;
  cargos: { etiqueta: string; esDirectiva: boolean }[];
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

export function AppNav({ nombreCompleto, esDirectiva, cargos }: Props) {
  return (
    <header className="flex items-center justify-between bg-ink px-4 py-3 text-paper sm:px-6">
      <Link href="/app" className="flex items-center gap-2.5">
        <Image src={club.logo} alt="" width={28} height={28} className="rounded" />
        <span className="font-display text-lg font-bold tracking-wide uppercase">
          {club.nombreCorto}
        </span>
      </Link>

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
    </header>
  );
}
