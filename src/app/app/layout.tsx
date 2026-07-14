import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cargosVigentes } from '@/lib/auth/roles';
import { AppNav } from '@/components/app-nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defensivo: el middleware ya protege /app/*, esto es la segunda barrera.
  if (!user) {
    redirect('/login');
  }

  const [{ data: usuario }, { data: esDirectiva }, { data: cargos }] = await Promise.all([
    supabase.from('usuario').select('nombre, apellido').eq('id', user.id).single(),
    supabase.rpc('es_directiva'),
    supabase
      .from('cargo_comision')
      .select(
        'cargo, vigente_desde, vigente_hasta, comision:comision_id(nombre, es_directiva, mandato_desde, mandato_hasta)',
      )
      .eq('usuario_id', user.id),
  ]);

  const nombreCompleto = usuario ? `${usuario.nombre} ${usuario.apellido}` : user.email!;

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav
        nombreCompleto={nombreCompleto}
        esDirectiva={!!esDirectiva}
        cargos={cargosVigentes(cargos ?? [])}
      />
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
