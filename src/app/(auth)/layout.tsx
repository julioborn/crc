import Image from 'next/image';
import { club } from '@/config/club';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Image src={club.logo} alt={club.nombreCorto} width={48} height={48} />
          <h1 className="font-display text-xl font-semibold tracking-tight">
            {club.nombreCompleto}
          </h1>
        </div>
        {children}
      </div>
    </div>
  );
}
