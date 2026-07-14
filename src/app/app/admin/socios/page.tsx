import { createClient } from '@/lib/supabase/server';
import { actualizarSocio } from '@/lib/admin/socios';
import { NuevoSocioForm } from './nuevo-socio-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader, NuevoCard, SectionLabel, ItemCard, EmptyState } from '@/components/admin/kit';

export default async function SociosPage() {
  const supabase = await createClient();

  const [{ data: socios }, { data: gruposFamiliares }, { data: ultimoNumero }] =
    await Promise.all([
      supabase
        .from('socio')
        .select(
          'id, usuario_id, numero_socio, fecha_alta, fecha_baja, grupo_familiar_id, usuario:usuario_id(nombre, apellido, email)',
        )
        .order('numero_socio'),
      supabase.from('grupo_familiar').select('id, nombre').eq('activo', true).order('nombre'),
      supabase
        .from('socio')
        .select('numero_socio')
        .order('numero_socio', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const siguienteNumero = (ultimoNumero?.numero_socio ?? 0) + 1;
  const usuarioIdsExistentes = (socios ?? []).map((s) => s.usuario_id);
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Administración"
        title="Socios"
        description="El alta se hace sobre un usuario que ya existe (se registró solo). Ser socio es una condición que la administración habilita, no un rol que se elige al registrarse."
      />

      <NuevoCard title="Dar de alta un socio">
        <NuevoSocioForm
          siguienteNumero={siguienteNumero}
          gruposFamiliares={gruposFamiliares ?? []}
          usuarioIdsExistentes={usuarioIdsExistentes}
        />
      </NuevoCard>

      <div className="space-y-3">
        <SectionLabel count={socios?.length ?? 0}>Socios</SectionLabel>
        {(socios ?? []).map((s) => {
          const activo = !s.fecha_baja || s.fecha_baja >= hoy;
          const vigenteAlta = s.fecha_alta <= hoy;

          return (
            <ItemCard key={s.id}>
              <form action={actualizarSocio.bind(null, s.id)} className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg font-semibold">
                    #{s.numero_socio} — {s.usuario?.nombre} {s.usuario?.apellido}
                  </p>
                  <span className="font-mono text-xs text-muted-foreground">{s.usuario?.email}</span>
                  <Badge variant={activo ? 'default' : 'secondary'}>
                    {activo ? (vigenteAlta ? 'Activo' : 'Alta futura') : 'De baja'}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Número de socio</label>
                    <Input name="numero_socio" type="number" min={1} defaultValue={s.numero_socio} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Grupo familiar</label>
                    <Select name="grupo_familiar_id" defaultValue={s.grupo_familiar_id ?? 'ninguno'}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ninguno">Sin grupo familiar</SelectItem>
                        {(gruposFamiliares ?? []).map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Fecha de alta</label>
                    <Input name="fecha_alta" type="date" defaultValue={s.fecha_alta} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Fecha de baja</label>
                    <Input name="fecha_baja" type="date" defaultValue={s.fecha_baja ?? ''} />
                  </div>
                </div>

                <Button type="submit" size="sm" variant="outline" className="w-auto">
                  Guardar
                </Button>
              </form>
            </ItemCard>
          );
        })}
        {socios?.length === 0 && <EmptyState>Todavía no hay socios cargados.</EmptyState>}
      </div>
    </div>
  );
}
