import Link from 'next/link';
import { club } from '@/config/club';
import { Button } from '@/components/ui/button';
import { MembershipCard } from '@/components/membership-card';

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16 sm:px-10">
      <div className="grid w-full max-w-5xl items-center gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        <div className="flex flex-col items-start gap-6 text-left">
          <p className="font-mono text-xs tracking-[0.2em] text-foreground/50 uppercase">
            Club social y deportivo
          </p>
          <h1 className="font-display text-5xl leading-[0.95] font-bold tracking-tight text-balance sm:text-6xl">
            {club.nombreCompleto}
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            Reservás cancha, pagás la cuota y te enterás de lo que pasa en el club.
            Todo desde acá.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/registro">Crear cuenta</Link>
            </Button>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <MembershipCard />
        </div>
      </div>
    </div>
  );
}
