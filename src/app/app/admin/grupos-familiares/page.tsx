import { createClient } from '@/lib/supabase/server';
import {
  actualizarGrupo,
  agregarSocioAGrupo,
  quitarSocioDeGrupo,
} from '@/lib/admin/grupos-familiares';
import { NuevoGrupoForm } from './nuevo-grupo-form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader, NuevoCard, SectionLabel, ItemCard, EmptyState } from '@/components/admin/kit';

export default async function GruposFamiliaresPage() {
  const supabase = await createClient();

  const [{ data: grupos }, { data: socios }] = await Promise.all([
    supabase.from('grupo_familiar').select('id, nombre, activo, titular_id').order('nombre'),
    supabase
      .from('socio')
      .select('id, numero_socio, grupo_familiar_id, usuario:usuario_id(nombre, apellido)')
      .order('numero_socio'),
  ]);

  const socioLabel = (s: { numero_socio: number; usuario: { nombre: string; apellido: string } | null }) =>
    `#${s.numero_socio} ${s.usuario?.nombre} ${s.usuario?.apellido}`;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Administración"
        title="Grupos familiares"
        description="Tarifa plana: una sola cuota social por grupo. Todos los integrantes son socios."
      />

      <NuevoCard title="Nuevo grupo familiar">
        <NuevoGrupoForm />
      </NuevoCard>

      <div className="space-y-3">
        <SectionLabel count={grupos?.length ?? 0}>Grupos cargados</SectionLabel>
        {(grupos ?? []).map((grupo) => {
          const miembros = (socios ?? []).filter((s) => s.grupo_familiar_id === grupo.id);
          const disponibles = (socios ?? []).filter((s) => s.grupo_familiar_id !== grupo.id);

          return (
            <ItemCard key={grupo.id} className="space-y-5">
              <div className="flex items-center gap-2">
                <p className="font-display text-lg font-semibold">{grupo.nombre}</p>
                {!grupo.activo && <Badge variant="secondary">Inactivo</Badge>}
              </div>

              <form action={actualizarGrupo.bind(null, grupo.id)} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nombre</label>
                  <Input name="nombre" defaultValue={grupo.nombre} required />
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Titular</label>
                    <select
                      name="titular_id"
                      defaultValue={grupo.titular_id ?? ''}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      <option value="">Sin titular</option>
                      {miembros.map((s) => (
                        <option key={s.id} value={s.id}>
                          {socioLabel(s)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 pb-2 text-sm">
                    <Checkbox name="activo" defaultChecked={grupo.activo} />
                    Activo
                  </label>
                </div>
                <Button type="submit" size="sm" variant="outline" className="w-auto">
                  Guardar
                </Button>
              </form>

              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">Integrantes</p>
                {miembros.length === 0 && (
                  <p className="text-sm text-muted-foreground">Todavía no tiene integrantes.</p>
                )}
                <ul className="space-y-1">
                  {miembros.map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-sm">
                      <span>
                        {socioLabel(s)}
                        {grupo.titular_id === s.id && (
                          <span className="ml-2 text-xs text-muted-foreground">(titular)</span>
                        )}
                      </span>
                      <form action={quitarSocioDeGrupo.bind(null, s.id)}>
                        <Button type="submit" variant="ghost" size="sm">
                          Quitar
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>

                {disponibles.length > 0 && (
                  <form action={agregarSocioAGrupo.bind(null, grupo.id)} className="flex gap-2 pt-2">
                    <select
                      name="socio_id"
                      required
                      className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      <option value="">Elegí un socio...</option>
                      {disponibles.map((s) => (
                        <option key={s.id} value={s.id}>
                          {socioLabel(s)}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline">
                      Agregar
                    </Button>
                  </form>
                )}
              </div>
            </ItemCard>
          );
        })}
        {grupos?.length === 0 && <EmptyState>Todavía no hay grupos familiares.</EmptyState>}
      </div>
    </div>
  );
}
