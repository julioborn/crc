import { createClient } from '@/lib/supabase/server';
import { NuevoArancelForm } from './nuevo-arancel-form';
import { Badge } from '@/components/ui/badge';

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
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Aranceles</h1>
        <p className="text-sm text-muted-foreground">
          Social, social familiar y por actividad. El monto se congela en cada
          cuota emitida — cambiar el arancel nunca afecta cuotas ya generadas.
        </p>
      </div>

      <NuevoArancelForm areas={areas ?? []} />

      <div className="space-y-6">
        {Array.from(grupos.entries()).map(([clave, lista]) => {
          const tipo = clave.split(':')[0];
          const nombreArea = lista[0]?.area?.nombre;
          return (
            <div key={clave} className="rounded-lg border p-4">
              <h2 className="mb-3 font-display text-lg font-semibold">
                {TIPO_LABEL[tipo]}
                {nombreArea ? ` · ${nombreArea}` : ''}
              </h2>
              <ul className="space-y-1.5 text-sm">
                {lista.map((a) => {
                  const vigente = a.vigente_hasta === null || a.vigente_hasta >= hoy;
                  return (
                    <li key={a.id} className="flex items-center gap-3">
                      <span className="font-mono">${a.monto}</span>
                      <span className="text-muted-foreground">
                        desde {a.vigente_desde}
                        {a.vigente_hasta ? ` hasta ${a.vigente_hasta}` : ''}
                      </span>
                      {vigente && <Badge>Vigente</Badge>}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {arancelesData.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay aranceles cargados.</p>
        )}
      </div>
    </div>
  );
}
