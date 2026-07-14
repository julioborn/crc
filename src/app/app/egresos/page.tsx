import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { areasGestionadas, type CargoRow } from '@/lib/auth/roles';
import { NuevoEgresoForm } from './nuevo-egreso-form';
import { Badge } from '@/components/ui/badge';
import { PageHeader, NuevoCard, SectionLabel, ItemCard, EmptyState } from '@/components/admin/kit';

export default async function EgresosPage() {
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

  if (!esDirectiva && misAreas.length === 0) {
    redirect('/app');
  }

  let areasDisponibles = misAreas;
  if (esDirectiva) {
    const { data } = await supabase.from('area').select('id, nombre').eq('activa', true).order('nombre');
    areasDisponibles = data ?? [];
  }

  const { data: movimientos } = await supabase
    .from('movimiento')
    .select('id, monto, concepto, fecha, area:area_id(nombre)')
    .eq('tipo', 'egreso')
    .order('fecha', { ascending: false })
    .limit(30);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Gestión"
        title="Egresos"
        description="Gastos de tu área (o del club, si sos CD). Queda registrado en el mismo lugar que los ingresos: movimiento."
      />

      <NuevoCard title="Registrar egreso">
        <NuevoEgresoForm areas={areasDisponibles} puedeClub={!!esDirectiva} />
      </NuevoCard>

      <div className="space-y-3">
        <SectionLabel count={movimientos?.length ?? 0}>Últimos egresos</SectionLabel>
        {(movimientos ?? []).map((m) => (
          <ItemCard key={m.id} className="flex flex-wrap items-center gap-3 space-y-0 py-3">
            <span className="text-sm text-muted-foreground">{m.fecha}</span>
            <span className="text-sm">{m.concepto}</span>
            <Badge variant="secondary">{m.area?.nombre ?? 'Club'}</Badge>
            <span className="ml-auto font-mono text-sm font-semibold">${m.monto}</span>
          </ItemCard>
        ))}
        {(movimientos?.length ?? 0) === 0 && <EmptyState>Todavía no hay egresos registrados.</EmptyState>}
      </div>
    </div>
  );
}
