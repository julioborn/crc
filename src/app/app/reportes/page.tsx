import { createClient } from '@/lib/supabase/server';
import { SocioPicker } from '@/components/admin/socio-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader, SectionLabel, ItemCard, EmptyState, StatRow } from '@/components/admin/kit';
import { Search } from 'lucide-react';

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
      <PageHeader
        eyebrow="Gestión"
        title="Reportes"
        description={
          esDirectiva
            ? 'Consolidado del club. Cada área abajo es lo que generó y gastó.'
            : 'Lo que generó y gastó tu área. Otras áreas no aparecen acá.'
        }
      />

      <section className="space-y-3">
        <SectionLabel count={grupos.size}>Por área</SectionLabel>
        {esDirectiva && (
          <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-5">
            <p className="mb-2 text-sm font-medium">Consolidado</p>
            <div className="flex flex-wrap gap-6">
              <StatRow label="Ingresos" value={`$${totalIngresos.toFixed(2)}`} />
              <StatRow label="Egresos" value={`$${totalEgresos.toFixed(2)}`} />
              <StatRow label="Neto" value={`$${(totalIngresos - totalEgresos).toFixed(2)}`} className="text-primary" />
            </div>
          </div>
        )}
        {Array.from(grupos.values()).map((g) => (
          <ItemCard key={g.nombre}>
            <p className="text-sm font-medium">{g.nombre}</p>
            <div className="flex flex-wrap gap-6">
              <StatRow label="Ingresos" value={`$${g.ingresos.toFixed(2)}`} />
              <StatRow label="Egresos" value={`$${g.egresos.toFixed(2)}`} />
              <StatRow label="Neto" value={`$${(g.ingresos - g.egresos).toFixed(2)}`} />
            </div>
          </ItemCard>
        ))}
        {grupos.size === 0 && <EmptyState>Todavía no hay movimientos.</EmptyState>}
      </section>

      <section className="space-y-3">
        <SectionLabel count={morosos?.length ?? 0}>Morosos</SectionLabel>
        {(morosos ?? []).map((c) => (
          <ItemCard key={c.id} className="flex flex-wrap items-center gap-2 space-y-0 py-3">
            <span className="text-sm">
              {c.socio
                ? `#${c.socio.numero_socio} ${c.socio.usuario?.nombre} ${c.socio.usuario?.apellido}`
                : `Grupo ${c.grupo_familiar?.nombre}`}
            </span>
            <Badge variant="secondary">{c.tipo === 'actividad' ? c.area?.nombre : 'Social'}</Badge>
            <span className="text-sm text-muted-foreground">{c.periodo}</span>
            <span className="ml-auto font-mono text-sm font-semibold">${c.monto}</span>
            <span className="text-xs text-destructive">venció {c.vencimiento}</span>
          </ItemCard>
        ))}
        {(morosos?.length ?? 0) === 0 && <EmptyState>No hay cuotas vencidas impagas.</EmptyState>}
      </section>

      <section className="space-y-3">
        <SectionLabel>Estado de cuenta de un socio</SectionLabel>
        <form method="GET" className="flex items-end gap-2 rounded-xl border p-4">
          <div className="flex-1 space-y-1">
            <label className="flex items-center gap-1.5 text-sm font-medium">
              <Search className="size-3.5 text-muted-foreground" /> Buscar socio
            </label>
            <SocioPicker name="socio_id" />
          </div>
          <Button type="submit" size="sm" variant="outline" className="w-auto">
            Ver cuenta
          </Button>
        </form>

        {socioId && !cuentaSocio && <EmptyState>No se encontró ese socio.</EmptyState>}

        {cuentaSocio && (
          <div className="space-y-3">
            <p className="font-display text-lg font-semibold">
              #{cuentaSocio.numero_socio} {cuentaSocio.usuario?.nombre} {cuentaSocio.usuario?.apellido}
            </p>
            {cuotasSocio.map((c) => (
              <ItemCard key={c.id} className="flex items-center gap-2 space-y-0 py-3">
                <span className="text-sm">{c.tipo === 'actividad' ? c.area?.nombre : 'Social'}</span>
                <span className="text-sm text-muted-foreground">{c.periodo}</span>
                <Badge variant={ESTADO_VARIANT[c.estado]}>{c.estado}</Badge>
                <span className="ml-auto font-mono text-sm font-semibold">${c.monto}</span>
              </ItemCard>
            ))}
            {cuotasSocio.length === 0 && <EmptyState>No tiene cuotas individuales.</EmptyState>}
          </div>
        )}
      </section>
    </div>
  );
}
