import { createClient } from '@/lib/supabase/server';
import { SocioPicker } from '@/components/admin/socio-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const ESTADO_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  impaga: 'destructive',
  pendiente: 'secondary',
  pagada: 'default',
  anulada: 'outline',
};

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ socio_id?: string }>;
}) {
  const { socio_id: socioId } = await searchParams;
  const supabase = await createClient();
  const { data: esDirectiva } = await supabase.rpc('es_directiva');

  // "movimientos de mi area" ya scopea esto solo: la CD ve todo (eso ES
  // el consolidado), una subcomisión solo ve las filas de sus áreas.
  const { data: movimientos } = await supabase
    .from('movimiento')
    .select('tipo, monto, area:area_id(id, nombre)')
    .order('fecha', { ascending: false });

  type Grupo = { nombre: string; ingresos: number; egresos: number };
  const grupos = new Map<string, Grupo>();
  let totalIngresos = 0;
  let totalEgresos = 0;

  for (const m of movimientos ?? []) {
    const clave = m.area?.id ?? 'club';
    const nombre = m.area?.nombre ?? 'Club (cuota social, gastos generales)';
    const g = grupos.get(clave) ?? { nombre, ingresos: 0, egresos: 0 };
    if (m.tipo === 'ingreso') {
      g.ingresos += m.monto;
      totalIngresos += m.monto;
    } else {
      g.egresos += m.monto;
      totalEgresos += m.monto;
    }
    grupos.set(clave, g);
  }

  const hoy = new Date().toISOString().slice(0, 10);

  // "mis cuotas" también scopea esto: CD ve todos los morosos, una
  // subcomisión solo los de actividad de su área.
  const { data: morosos } = await supabase
    .from('cuota')
    .select(
      'id, tipo, periodo, monto, vencimiento, area:area_id(nombre), socio:socio_id(numero_socio, usuario:usuario_id(nombre, apellido)), grupo_familiar:grupo_familiar_id(nombre)',
    )
    .eq('estado', 'impaga')
    .lt('vencimiento', hoy)
    .order('vencimiento');

  let cuentaSocio: { id: string; numero_socio: number; usuario: { nombre: string; apellido: string } | null } | null = null;
  let cuotasSocio: { id: string; tipo: string; periodo: string; monto: number; estado: string; area: { nombre: string } | null }[] = [];

  if (socioId) {
    const { data } = await supabase
      .from('socio')
      .select('id, numero_socio, usuario:usuario_id(nombre, apellido)')
      .eq('id', socioId)
      .maybeSingle();
    cuentaSocio = data;

    if (cuentaSocio) {
      const { data: cuotasData } = await supabase
        .from('cuota')
        .select('id, tipo, periodo, monto, estado, area:area_id(nombre)')
        .eq('socio_id', cuentaSocio.id)
        .order('periodo', { ascending: false });
      cuotasSocio = cuotasData ?? [];
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          {esDirectiva
            ? 'Consolidado del club. Cada área abajo es lo que generó y gastó.'
            : 'Lo que generó y gastó tu área. Otras áreas no aparecen acá.'}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Por área</h2>
        {esDirectiva && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-medium">Consolidado</p>
            <div className="mt-1 flex gap-6 font-mono text-sm">
              <span>Ingresos ${totalIngresos.toFixed(2)}</span>
              <span>Egresos ${totalEgresos.toFixed(2)}</span>
              <span className="font-semibold">Neto ${(totalIngresos - totalEgresos).toFixed(2)}</span>
            </div>
          </div>
        )}
        {Array.from(grupos.values()).map((g) => (
          <div key={g.nombre} className="rounded-lg border p-4">
            <p className="text-sm font-medium">{g.nombre}</p>
            <div className="mt-1 flex gap-6 font-mono text-sm text-muted-foreground">
              <span>Ingresos ${g.ingresos.toFixed(2)}</span>
              <span>Egresos ${g.egresos.toFixed(2)}</span>
              <span>Neto ${(g.ingresos - g.egresos).toFixed(2)}</span>
            </div>
          </div>
        ))}
        {grupos.size === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay movimientos.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Morosos</h2>
        {(morosos ?? []).map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
            <span>
              {c.socio
                ? `#${c.socio.numero_socio} ${c.socio.usuario?.nombre} ${c.socio.usuario?.apellido}`
                : `Grupo ${c.grupo_familiar?.nombre}`}
            </span>
            <Badge variant="secondary">
              {c.tipo === 'actividad' ? c.area?.nombre : 'Social'}
            </Badge>
            <span className="text-muted-foreground">{c.periodo}</span>
            <span className="ml-auto font-mono">${c.monto}</span>
            <span className="text-xs text-destructive">venció {c.vencimiento}</span>
          </div>
        ))}
        {(morosos?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No hay cuotas vencidas impagas.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Estado de cuenta de un socio</h2>
        <form method="GET" className="flex flex-col gap-2">
          <SocioPicker name="socio_id" />
          <Button type="submit" size="sm" variant="outline" className="w-auto">
            Ver cuenta
          </Button>
        </form>

        {socioId && !cuentaSocio && (
          <p className="text-sm text-muted-foreground">No se encontró ese socio.</p>
        )}

        {cuentaSocio && (
          <div className="space-y-2">
            <p className="font-medium">
              #{cuentaSocio.numero_socio} {cuentaSocio.usuario?.nombre}{' '}
              {cuentaSocio.usuario?.apellido}
            </p>
            {cuotasSocio.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                <span>{c.tipo === 'actividad' ? c.area?.nombre : 'Social'}</span>
                <span className="text-muted-foreground">{c.periodo}</span>
                <Badge variant={ESTADO_VARIANT[c.estado]}>{c.estado}</Badge>
                <span className="ml-auto font-mono">${c.monto}</span>
              </div>
            ))}
            {cuotasSocio.length === 0 && (
              <p className="text-sm text-muted-foreground">No tiene cuotas individuales.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
