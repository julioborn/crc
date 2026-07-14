import { createClient } from '@/lib/supabase/server';
import { actualizarArea } from '@/lib/admin/areas';
import { NuevaAreaForm } from './nueva-area-form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

export default async function AreasPage() {
  const supabase = await createClient();
  const { data: areas } = await supabase.from('area').select('*').order('nombre');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Áreas</h1>
        <p className="text-sm text-muted-foreground">
          Básquet, pádel, fútbol, quincho... Cada una se asigna a una comisión y
          puede tener actividades inscribibles.
        </p>
      </div>

      <NuevaAreaForm />

      <div className="space-y-3">
        {(areas ?? []).map((area) => (
          <form
            key={area.id}
            action={actualizarArea.bind(null, area.id)}
            className="space-y-3 rounded-lg border p-4"
          >
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
            <div className="flex flex-wrap items-center gap-6 text-sm">
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
        ))}
        {areas?.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay áreas cargadas.</p>
        )}
      </div>
    </div>
  );
}
