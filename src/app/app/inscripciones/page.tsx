import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { areasGestionadas, type CargoRow } from '@/lib/auth/roles';
import { darDeBajaInscripcion } from '@/lib/admin/inscripciones';
import { NuevaInscripcionForm } from './nueva-inscripcion-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default async function InscripcionesPage() {
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

  // Universo de áreas elegibles para inscribir: todas las inscribibles y
  // activas si es CD, o solo las propias si es subcomisión. La RLS
  // ("gestiono actividades de mi area") es quien de verdad lo hace
  // cumplir — esto solo arma las opciones del formulario.
  let areasQuery = supabase
    .from('area')
    .select('id, nombre')
    .eq('es_inscribible', true)
    .eq('activa', true);

  if (!esDirectiva) {
    areasQuery = areasQuery.in(
      'id',
      misAreas.map((a) => a.id),
    );
  }

  const { data: areasElegibles } = await areasQuery.order('nombre');

  const { data: inscripciones } = await supabase
    .from('socio_area')
    .select(
      'id, fecha_alta, fecha_baja, area:area_id(nombre), socio:socio_id(numero_socio, usuario:usuario_id(nombre, apellido))',
    )
    .order('fecha_alta', { ascending: false });

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Inscripción a actividades
        </h1>
        <p className="text-sm text-muted-foreground">
          Inscribir a un socio genera el adicional de esa actividad — no entra
          en el descuento del grupo familiar.
        </p>
      </div>

      {(areasElegibles?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay áreas inscribibles activas asignadas a tu comisión todavía.
        </p>
      ) : (
        <NuevaInscripcionForm areas={areasElegibles ?? []} />
      )}

      <div className="space-y-3">
        {(inscripciones ?? []).map((i) => {
          const activa = !i.fecha_baja || i.fecha_baja >= hoy;
          return (
            <form
              key={i.id}
              action={darDeBajaInscripcion.bind(null, i.id)}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
            >
              <span className="text-sm font-medium">
                #{i.socio?.numero_socio} {i.socio?.usuario?.nombre}{' '}
                {i.socio?.usuario?.apellido}
              </span>
              <Badge variant="secondary">{i.area?.nombre}</Badge>
              <Badge variant={activa ? 'default' : 'secondary'}>
                {activa ? 'Activa' : 'De baja'}
              </Badge>
              <span className="text-xs text-muted-foreground">desde {i.fecha_alta}</span>

              {activa && (
                <div className="ml-auto flex items-center gap-2">
                  <Input
                    name="fecha_baja"
                    type="date"
                    defaultValue={hoy}
                    className="h-8 w-auto"
                  />
                  <Button type="submit" size="sm" variant="outline">
                    Dar de baja
                  </Button>
                </div>
              )}
            </form>
          );
        })}
        {inscripciones?.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay inscripciones.</p>
        )}
      </div>
    </div>
  );
}
