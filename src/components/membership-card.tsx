import Image from 'next/image';
import { club } from '@/config/club';

/**
 * El carnet de socio es un objeto real del club (mencionado en el
 * dominio: "escanear carnet" en la app de administración). Es el elemento
 * de la landing: no es una tarjeta genérica, es el objeto físico que
 * cualquier socio del club reconoce, reinterpretado como pieza digital.
 */
export function MembershipCard() {
  return (
    <div
      className="w-full max-w-sm -rotate-2 rounded-2xl bg-card shadow-xl ring-1 ring-ink/10 transition-transform duration-500 hover:rotate-0 motion-reduce:rotate-0 motion-reduce:transition-none"
      aria-hidden
    >
      <div className="h-2 rounded-t-2xl bg-primary" />
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Image
            src={club.logo}
            alt=""
            width={36}
            height={36}
            className="rounded-md"
          />
          <span className="font-display text-2xl font-bold tracking-tight text-ink uppercase">
            {club.nombreCorto}
          </span>
        </div>

        <div className="h-px bg-ink/10" />

        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-[0.65rem] tracking-[0.2em] text-ink/50 uppercase">
              Socio N.º
            </p>
            <p className="font-mono text-2xl tracking-wider text-ink">000001</p>
          </div>
          <p className="font-mono text-[0.65rem] tracking-[0.15em] text-ink/50 uppercase">
            Carnet digital
          </p>
        </div>
      </div>
    </div>
  );
}
