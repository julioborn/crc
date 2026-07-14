import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { areasGestionadas, type CargoRow } from '@/lib/auth/roles';
import { hoyLocal, limitesDiaLocalUtc, formatearFechaHoraLocal, formatearHoraLocal } from '@/lib/reservas/tz';
import { aprobarTurno, rechazarTurno, marcarAusente } from '@/lib/admin/panel-turnos';
import { CobrarTurnoForm } from './cobrar-turno-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ESTADO_LABEL: Record<string, string> = {
  pendiente_aprobacion: 'Pendiente',
  confirmado: 'Confirmado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
  ausente: 'Ausente',
};

export default async function PanelTurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha } = await searchParams;
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

  let areaIds: string[] = misAreas.map((a) => a.id);
  if (esDirectiva) {
    const { data } = await supabase.from('area').select('id');
    areaIds = (data ?? []).map((a) => a.id);
  }

  const { data: recursos } = await supabase.from('recurso').select('id, nombre').in('area_id', areaIds);
  const recursoIds = (recursos ?? []).map((r) => r.id);
  const nombreRecurso = new Map((recursos ?? []).map((r) => [r.id, r.nombre]));

  const { data: pendientes } = await supabase
    .from('turno')
    .select('id, inicio, fin, precio, recurso_id, usuario:usuario!usuario_id(nombre, apellido)')
    .in('recurso_id', recursoIds)
    .eq('estado', 'pendiente_aprobacion')
    .order('inicio');

  const hoy = hoyLocal();
  const fechaAgenda = fecha ?? hoy;
  const { desde: inicioDia, hasta: finDia } = limitesDiaLocalUtc(fechaAgenda);

  const { data: agenda } = await supabase
    .from('turno')
    .select(
      'id, inicio, fin, estado, precio, cobrado, recurso_id, usuario:usuario!usuario_id(nombre, apellido)',
    )
    .in('recurso_id', recursoIds)
    .gte('inicio', inicioDia)
    .lte('inicio', finDia)
    .order('inicio');

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Panel de turnos</h1>
        <p className="text-sm text-muted-foreground">
          Aprobá lo pendiente, cobrá lo presencial, marcá ausentes.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Pendientes de aprobación</h2>
        {(pendientes ?? []).map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
            <span className="font-medium">{nombreRecurso.get(t.recurso_id)}</span>
            <span className="text-muted-foreground">
              {t.usuario?.nombre} {t.usuario?.apellido}
            </span>
            <span className="text-muted-foreground">{formatearFechaHoraLocal(t.inicio)}</span>
            <span className="font-mono">${t.precio}</span>
            <div className="ml-auto flex gap-2">
              <form action={aprobarTurno.bind(null, t.id)}>
                <Button type="submit" size="sm">
                  Aprobar
                </Button>
              </form>
              <form action={rechazarTurno.bind(null, t.id)}>
                <Button type="submit" size="sm" variant="outline">
                  Rechazar
                </Button>
              </form>
            </div>
          </div>
        ))}
        {(pendientes?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No hay turnos pendientes.</p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Agenda del día</h2>
          <form method="GET" className="flex items-center gap-2">
            <input
              type="date"
              name="fecha"
              defaultValue={fechaAgenda}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            />
            <Button type="submit" size="sm" variant="outline" className="w-auto">
              Ver
            </Button>
          </form>
        </div>

        {(agenda ?? []).map((t) => (
          <div key={t.id} className="space-y-2 rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium">{nombreRecurso.get(t.recurso_id)}</span>
              <span className="text-muted-foreground">
                {t.usuario?.nombre} {t.usuario?.apellido}
              </span>
              <span className="text-muted-foreground">
                {formatearHoraLocal(t.inicio)}–{formatearHoraLocal(t.fin)}
              </span>
              <Badge variant="secondary">{ESTADO_LABEL[t.estado]}</Badge>
              <Badge variant={t.cobrado ? 'default' : 'secondary'}>
                {t.cobrado ? 'Cobrado' : 'Sin cobrar'}
              </Badge>
              <span className="ml-auto font-mono">${t.precio}</span>
              {t.estado === 'confirmado' && (
                <form action={marcarAusente.bind(null, t.id)}>
                  <Button type="submit" size="sm" variant="ghost">
                    Marcar ausente
                  </Button>
                </form>
              )}
            </div>
            {t.estado === 'confirmado' && !t.cobrado && <CobrarTurnoForm turnoId={t.id} />}
          </div>
        ))}
        {(agenda?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No hay turnos ese día.</p>
        )}
      </section>
    </div>
  );
}
