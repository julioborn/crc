import { createClient } from '@/lib/supabase/server';
import { actualizarArea } from '@/lib/admin/areas';
import { NuevaAreaForm } from './nueva-area-form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader, NuevoCard, SectionLabel, ItemCard, EmptyState } from '@/components/admin/kit';

export default async function AreasPage() {
  const supabase = await createClient();
  const { data: areas } = await supabase.from('area').select('*').order('nombre');

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Administración"
        title="Áreas"
        description="Básquet, pádel, fútbol, quincho... Cada una se asigna a una comisión y puede tener actividades inscribibles."
      />

      <NuevoCard title="Nueva área">
        <NuevaAreaForm />
      </NuevoCard>

      <div className="space-y-3">
        <SectionLabel count={areas?.length ?? 0}>Áreas cargadas</SectionLabel>
        {(areas ?? []).map((area) => (
          <ItemCard key={area.id}>
            <form action={actualizarArea.bind(null, area.id)} className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="font-display text-lg font-semibold">{area.nombre}</p>
                {!area.activa && <Badge variant="secondary">Inactiva</Badge>}
                {area.es_inscribible && <Badge variant="outline">Inscribible</Badge>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nombre</label>
                  <Input name="nombre" defaultValue={area.nombre} required />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Descripción</label>
                  <Input name="descripcion" defaultValue={area.descripcion ?? ''} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-6 border-t pt-3 text-sm">
                <label className="flex items-center gap-2">
                  <Checkbox name="es_inscribible" defaultChecked={area.es_inscribible} />
                  Inscribible
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox name="activa" defaultChecked={area.activa} />
                  Activa
                </label>
                <Button type="submit" size="sm" variant="outline" className="ml-auto w-auto">
                  Guardar
                </Button>
              </div>
            </form>
          </ItemCard>
        ))}
        {areas?.length === 0 && <EmptyState>Todavía no hay áreas cargadas.</EmptyState>}
      </div>
    </div>
  );
}
