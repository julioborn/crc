import { createClient } from '@/lib/supabase/server';
import { NuevoArancelForm } from './nuevo-arancel-form';
import { Badge } from '@/components/ui/badge';
import { PageHeader, NuevoCard, SectionLabel, ItemCard, EmptyState } from '@/components/admin/kit';
import { cn } from '@/lib/utils';

const TIPO_LABEL: Record<string, string> = {
  social: 'Social',
  social_familiar: 'Social familiar',
  actividad: 'Actividad',
};

export default async function ArancelesPage() {
  const supabase = await createClient();

  const [{ data: areas }, { data: aranceles }] = await Promise.all([
    supabase.from('area').select('id, nombre').eq('activa', true).order('nombre'),
    supabase
      .from('arancel')
      .select('id, tipo, area_id, monto, vigente_desde, vigente_hasta, area:area_id(nombre)')
      .order('tipo')
      .order('vigente_desde', { ascending: false }),
  ]);

  const hoy = new Date().toISOString().slice(0, 10);
  const arancelesData = aranceles ?? [];

  const grupos = new Map<string, typeof arancelesData>();
  for (const a of arancelesData) {
    const clave = `${a.tipo}:${a.area_id ?? ''}`;
    const lista = grupos.get(clave) ?? [];
    lista.push(a);
    grupos.set(clave, lista);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Administración"
        title="Aranceles"
        description="Social, social familiar y por actividad. El monto se congela en cada cuota emitida — cambiar el arancel nunca afecta cuotas ya generadas."
      />

      <NuevoCard title="Nuevo arancel">
        <NuevoArancelForm areas={areas ?? []} />
      </NuevoCard>

      <div className="space-y-3">
        <SectionLabel count={grupos.size}>Aranceles</SectionLabel>
        {Array.from(grupos.entries()).map(([clave, lista]) => {
          const tipo = clave.split(':')[0];
          const nombreArea = lista[0]?.area?.nombre;
          return (
            <ItemCard key={clave}>
              <p className="font-display text-lg font-semibold">
                {TIPO_LABEL[tipo]}
                {nombreArea ? ` · ${nombreArea}` : ''}
              </p>
              <ul className="space-y-2 text-sm">
                {lista.map((a) => {
                  const vigente = a.vigente_hasta === null || a.vigente_hasta >= hoy;
                  return (
                    <li key={a.id} className="flex items-center gap-3">
                      <span
                        className={cn(
                          'font-mono',
                          vigente ? 'text-xl font-semibold text-primary' : 'text-muted-foreground',
                        )}
                      >
                        ${a.monto}
                      </span>
                      <span className="text-muted-foreground">
                        desde {a.vigente_desde}
                        {a.vigente_hasta ? ` hasta ${a.vigente_hasta}` : ''}
                      </span>
                      {vigente && <Badge>Vigente</Badge>}
                    </li>
                  );
                })}
              </ul>
            </ItemCard>
          );
        })}
        {arancelesData.length === 0 && <EmptyState>Todavía no hay aranceles cargados.</EmptyState>}
      </div>
    </div>
  );
}
