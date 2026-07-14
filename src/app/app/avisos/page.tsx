import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { areasGestionadas, type CargoRow } from '@/lib/auth/roles';
import { NuevoAvisoForm } from './nuevo-aviso-form';
import { AvisoCard } from './aviso-card';
import { PageHeader, NuevoCard, SectionLabel, EmptyState } from '@/components/admin/kit';

export default async function AvisosPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id: avisoDestacado } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: esDirectiva }, { data: cargos }] = await Promise.all([
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

  const misAreas = areasGestionadas((cargos ?? []) as unknown as CargoRow[]);
  const puedePublicar = !!esDirectiva || misAreas.length > 0;

  let areasForm = misAreas;
  if (esDirectiva) {
    const { data } = await supabase.from('area').select('id, nombre').eq('activa', true).order('nombre');
    areasForm = data ?? [];
  }

  const [{ data: avisos }, { data: lecturas }] = await Promise.all([
    supabase
      .from('aviso')
      .select('id, titulo, cuerpo, alcance, area_id, area:area_id(nombre), imagen_url, created_at, usuario_id')
      .order('created_at', { ascending: false }),
    supabase.from('aviso_lectura').select('aviso_id').eq('usuario_id', user.id),
  ]);

  const leidos = new Set((lecturas ?? []).map((l) => l.aviso_id));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Comunicación"
        title="Avisos"
        description="Globales para todo el club, o por área para quien está inscripto en ella."
      />

      {puedePublicar && (
        <NuevoCard title="Nuevo aviso">
          <NuevoAvisoForm esDirectiva={!!esDirectiva} areas={areasForm} />
        </NuevoCard>
      )}

      <div className="space-y-3">
        <SectionLabel count={avisos?.length ?? 0}>Avisos</SectionLabel>
        {(avisos ?? []).map((a) => (
          <AvisoCard
            key={a.id}
            aviso={a}
            leido={leidos.has(a.id)}
            puedeEditar={a.usuario_id === user.id || !!esDirectiva}
            esActual={a.id === avisoDestacado}
            fechaLabel={new Date(a.created_at).toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
          />
        ))}
        {(avisos?.length ?? 0) === 0 && <EmptyState>Todavía no hay avisos.</EmptyState>}
      </div>
    </div>
  );
}
