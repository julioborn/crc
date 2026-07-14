import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Guard de UX: si no es CD, no tiene sentido mostrarle un CRUD que la
 * RLS le va a rechazar en cada acción. El gate real sigue siendo
 * es_directiva() en la base — esto solo evita la pantalla rota.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: esDirectiva } = await supabase.rpc('es_directiva');

  if (!esDirectiva) {
    redirect('/app');
  }

  return <div className="mx-auto max-w-4xl">{children}</div>;
}
