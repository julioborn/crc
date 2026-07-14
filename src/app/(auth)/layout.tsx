import Image from 'next/image';
import { club } from '@/config/club';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Image src={club.logo} alt={club.nombreCorto} width={56} height={56} />
          <h1 className="text-lg font-semibold">{club.nombreCompleto}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
