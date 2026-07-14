import Image from 'next/image';
import Link from 'next/link';
import { club } from '@/config/club';
import { buttonVariants } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
      <Image src={club.logo} alt={club.nombreCorto} width={96} height={96} priority />
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{club.nombreCompleto}</h1>
        <p className="text-muted-foreground">
          Socios, turnos y cuotas en un solo lugar.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/login" className={buttonVariants()}>
          Iniciar sesión
        </Link>
        <Link href="/registro" className={buttonVariants({ variant: 'outline' })}>
          Crear cuenta
        </Link>
      </div>
    </div>
  );
}
