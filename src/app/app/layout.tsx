import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cargosVigentes, areasGestionadas, type CargoRow } from '@/lib/auth/roles';
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
        `cargo, vigente_desde, vigente_hasta,
         comision:comision_id(nombre, es_directiva, mandato_desde, mandato_hasta,
           comision_area(area:area_id(id, nombre)))`,
      )
      .eq('usuario_id', user.id),
  ]);

  const nombreCompleto = usuario ? `${usuario.nombre} ${usuario.apellido}` : user.email!;
  // El embed anidado (comision -> comision_area -> area) es más profundo de
  // lo que el generador de tipos de supabase-js resuelve bien; el shape real
  // en runtime sí coincide con CargoRow.
  const cargosData = (cargos ?? []) as unknown as CargoRow[];

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav
        nombreCompleto={nombreCompleto}
        esDirectiva={!!esDirectiva}
        cargos={cargosVigentes(cargosData)}
        tieneAreasGestionadas={areasGestionadas(cargosData).length > 0}
      />
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
