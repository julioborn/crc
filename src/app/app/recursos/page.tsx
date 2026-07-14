import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { areasGestionadas, type CargoRow } from '@/lib/auth/roles';
import { actualizarRecurso } from '@/lib/admin/recursos';
import { quitarDisponibilidad } from '@/lib/admin/disponibilidad';
import { quitarBloqueo } from '@/lib/admin/bloqueos';
import { formatearFechaHoraLocal } from '@/lib/reservas/tz';
import { NuevoRecursoForm } from './nuevo-recurso-form';
import { DisponibilidadForm } from './disponibilidad-form';
import { BloqueoForm } from './bloqueo-form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default async function RecursosPage() {
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

  let areas = misAreas;
  if (esDirectiva) {
    const { data } = await supabase.from('area').select('id, nombre').eq('activa', true).order('nombre');
    areas = data ?? [];
  }
  const areaIds = areas.map((a) => a.id);

  const [{ data: recursos }, { data: disponibilidades }, { data: bloqueos }] = await Promise.all([
    supabase.from('recurso').select('*').in('area_id', areaIds).order('nombre'),
    supabase.from('disponibilidad').select('*').order('dia_semana'),
    supabase.from('bloqueo').select('*').order('desde'),
  ]);

  const dispPorRecurso = new Map<string, typeof disponibilidades>();
  for (const d of disponibilidades ?? []) {
    const lista = dispPorRecurso.get(d.recurso_id) ?? [];
    lista.push(d);
    dispPorRecurso.set(d.recurso_id, lista);
  }
  const bloqueosPorRecurso = new Map<string, typeof bloqueos>();
  for (const b of bloqueos ?? []) {
    const lista = bloqueosPorRecurso.get(b.recurso_id) ?? [];
    lista.push(b);
    bloqueosPorRecurso.set(b.recurso_id, lista);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Recursos</h1>
        <p className="text-sm text-muted-foreground">
          Canchas, quincho, lo que se reserve. Cada uno con su precio, su
          aprobación (automática o manual) y su ventana de cancelación.
        </p>
      </div>

      <NuevoRecursoForm areas={areas} />

      <div className="space-y-6">
        {(recursos ?? []).map((r) => {
          const disp = dispPorRecurso.get(r.id) ?? [];
          const blq = bloqueosPorRecurso.get(r.id) ?? [];

          return (
            <div key={r.id} className="space-y-4 rounded-lg border p-4">
              <form action={actualizarRecurso.bind(null, r.id)} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nombre</label>
                  <Input name="nombre" defaultValue={r.nombre} required />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Precio socio</label>
                    <Input name="precio_socio" type="number" min="0" step="0.01" defaultValue={r.precio_socio} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Precio no socio</label>
                    <Input name="precio_no_socio" type="number" min="0" step="0.01" defaultValue={r.precio_no_socio} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Duración (min)</label>
                    <Input name="duracion_minutos" type="number" min="15" step="15" defaultValue={r.duracion_minutos} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Horas para cancelar</label>
                    <Input name="horas_cancelacion" type="number" min="0" defaultValue={r.horas_cancelacion} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <label className="flex items-center gap-2">
                    <Checkbox name="aprobacion_automatica" defaultChecked={r.aprobacion_automatica} />
                    Aprobación automática
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox name="activo" defaultChecked={r.activo} />
                    Activo
                  </label>
                  <Button type="submit" size="sm" variant="outline" className="ml-auto w-auto">
                    Guardar
                  </Button>
                </div>
              </form>

              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">Disponibilidad</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {disp.map((d) => (
                    <li key={d.id} className="flex items-center gap-2">
                      <span>
                        {DIAS[d.dia_semana]} {d.hora_desde}–{d.hora_hasta}
                      </span>
                      <form action={quitarDisponibilidad.bind(null, d.id)}>
                        <Button type="submit" variant="ghost" size="sm">
                          Quitar
                        </Button>
                      </form>
                    </li>
                  ))}
                  {disp.length === 0 && <li>Sin franjas cargadas.</li>}
                </ul>
                <DisponibilidadForm recursoId={r.id} />
              </div>

              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">Bloqueos</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {blq.map((b) => (
                    <li key={b.id} className="flex items-center gap-2">
                      <span>
                        {formatearFechaHoraLocal(b.desde)} — {formatearFechaHoraLocal(b.hasta)}
                        {b.motivo ? ` (${b.motivo})` : ''}
                      </span>
                      <form action={quitarBloqueo.bind(null, b.id)}>
                        <Button type="submit" variant="ghost" size="sm">
                          Quitar
                        </Button>
                      </form>
                    </li>
                  ))}
                  {blq.length === 0 && <li>Sin bloqueos cargados.</li>}
                </ul>
                <BloqueoForm recursoId={r.id} />
              </div>
            </div>
          );
        })}
        {(recursos?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay recursos cargados.</p>
        )}
      </div>
    </div>
  );
}
