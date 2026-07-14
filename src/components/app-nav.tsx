import Image from 'next/image';
import Link from 'next/link';
import { club } from '@/config/club';
import { logout } from '@/lib/auth/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Props = {
  nombreCompleto: string;
  esDirectiva: boolean;
  cargos: { etiqueta: string; esDirectiva: boolean }[];
};

export function AppNav({ nombreCompleto, esDirectiva, cargos }: Props) {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
      <Link href="/app" className="flex items-center gap-2">
        <Image src={club.logo} alt={club.nombreCorto} width={28} height={28} />
        <span className="font-semibold">{club.nombreCorto}</span>
      </Link>

      <div className="flex items-center gap-2">
        {esDirectiva && <Badge>Comisión Directiva</Badge>}
        {!esDirectiva &&
          cargos.map((c) => (
            <Badge key={c.etiqueta} variant="secondary">
              {c.etiqueta}
            </Badge>
          ))}

        <span className="ml-2 text-sm text-muted-foreground">{nombreCompleto}</span>

        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Salir
          </Button>
        </form>
      </div>
    </header>
  );
}
