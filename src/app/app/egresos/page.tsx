import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { areasGestionadas, type CargoRow } from '@/lib/auth/roles';
import { NuevoEgresoForm } from './nuevo-egreso-form';
import { Badge } from '@/components/ui/badge';

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
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Egresos</h1>
        <p className="text-sm text-muted-foreground">
          Gastos de tu área (o del club, si sos CD). Queda registrado en el
          mismo lugar que los ingresos: movimiento.
        </p>
      </div>

      <NuevoEgresoForm areas={areasDisponibles} puedeClub={!!esDirectiva} />

      <div className="space-y-2">
        <h2 className="font-display text-lg font-semibold">Últimos egresos</h2>
        {(movimientos ?? []).map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
            <span className="text-muted-foreground">{m.fecha}</span>
            <span>{m.concepto}</span>
            <Badge variant="secondary">{m.area?.nombre ?? 'Club'}</Badge>
            <span className="ml-auto font-mono">${m.monto}</span>
          </div>
        ))}
        {(movimientos?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay egresos registrados.</p>
        )}
      </div>
    </div>
  );
}
