import { createClient } from '@/lib/supabase/server';
import { actualizarComision, actualizarAreasComision } from '@/lib/admin/comisiones';
import { NuevaComisionForm } from './nueva-comision-form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader, NuevoCard, SectionLabel, ItemCard, EmptyState } from '@/components/admin/kit';

export default async function ComisionesPage() {
  const supabase = await createClient();

  const [{ data: comisiones }, { data: areas }, { data: comisionArea }] = await Promise.all([
    supabase.from('comision').select('*').order('es_directiva', { ascending: false }).order('mandato_desde', { ascending: false }),
    supabase.from('area').select('id, nombre').order('nombre'),
    supabase.from('comision_area').select('comision_id, area_id'),
  ]);

  const areasPorComision = new Map<string, Set<string>>();
  for (const ca of comisionArea ?? []) {
    const set = areasPorComision.get(ca.comision_id) ?? new Set<string>();
    set.add(ca.area_id);
    areasPorComision.set(ca.comision_id, set);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Administración"
        title="Comisiones"
        description="La Comisión Directiva General tiene alcance global. Las subcomisiones gestionan solo las áreas que se les asignen acá abajo."
      />

      <NuevoCard title="Nueva comisión">
        <NuevaComisionForm />
      </NuevoCard>

      <div className="space-y-3">
        <SectionLabel count={comisiones?.length ?? 0}>Comisiones cargadas</SectionLabel>
        {(comisiones ?? []).map((comision) => {
          const areasAsignadas = areasPorComision.get(comision.id) ?? new Set<string>();

          return (
            <ItemCard key={comision.id} className="space-y-5">
              <div className="flex items-center gap-2">
                <p className="font-display text-lg font-semibold">{comision.nombre}</p>
                {comision.es_directiva && <Badge>CD General</Badge>}
              </div>

              <form action={actualizarComision.bind(null, comision.id)} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nombre</label>
                  <Input name="nombre" defaultValue={comision.nombre} required />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Mandato desde</label>
                    <Input name="mandato_desde" type="date" defaultValue={comision.mandato_desde} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Mandato hasta</label>
                    <Input name="mandato_hasta" type="date" defaultValue={comision.mandato_hasta} required />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox name="es_directiva" defaultChecked={comision.es_directiva} />
                  Es la Comisión Directiva General
                </label>
                <Button type="submit" size="sm" variant="outline" className="w-auto">
                  Guardar
                </Button>
              </form>

              {!comision.es_directiva && (
                <form action={actualizarAreasComision.bind(null, comision.id)} className="space-y-3 border-t pt-4">
                  <p className="text-sm font-medium">Áreas que gestiona</p>
                  <div className="flex flex-wrap gap-4">
                    {(areas ?? []).map((area) => (
                      <label key={area.id} className="flex items-center gap-2 text-sm">
                        <Checkbox name="area_ids" value={area.id} defaultChecked={areasAsignadas.has(area.id)} />
                        {area.nombre}
                      </label>
                    ))}
                    {areas?.length === 0 && (
                      <p className="text-sm text-muted-foreground">No hay áreas creadas.</p>
                    )}
                  </div>
                  <Button type="submit" size="sm" variant="outline" className="w-auto">
                    Guardar áreas
                  </Button>
                </form>
              )}
            </ItemCard>
          );
        })}
        {comisiones?.length === 0 && <EmptyState>Todavía no hay comisiones cargadas.</EmptyState>}
      </div>
    </div>
  );
}
