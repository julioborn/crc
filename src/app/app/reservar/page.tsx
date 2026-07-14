import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calcularCeldas, type Celda } from '@/lib/reservas/slots';
import { hoyLocal, sumarDiasLocal, limitesDiaLocalUtc, formatearHoraLocal } from '@/lib/reservas/tz';
import { ReservaGrid } from './reserva-grid';
import { SelectorFecha } from './selector-fecha';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default async function ReservarPage({
  searchParams,
}: {
  searchParams: Promise<{ area_id?: string; fecha?: string }>;
}) {
  const { area_id: areaId, fecha: fechaParam } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const hoy = hoyLocal();
  const fecha = fechaParam ?? hoy;

  const [{ data: areas }, { data: miSocio }] = await Promise.all([
    supabase.from('area').select('id, nombre').eq('activa', true).order('nombre'),
    supabase
      .from('socio')
      .select('id')
      .eq('usuario_id', user.id)
      .lte('fecha_alta', hoy)
      .or(`fecha_baja.is.null,fecha_baja.gte.${hoy}`)
      .maybeSingle(),
  ]);
  const esSocio = !!miSocio;

  const areaSeleccionada = areaId ? (areas ?? []).find((a) => a.id === areaId) : null;

  let recursos: {
    id: string;
    nombre: string;
    precio_socio: number;
    precio_no_socio: number;
    duracion_minutos: number;
  }[] = [];
  let filas: { horaLabel: string; celdas: Record<string, Celda | undefined> }[] = [];

  if (areaSeleccionada) {
    const { data: recursosData } = await supabase
      .from('recurso')
      .select('id, nombre, precio_socio, precio_no_socio, duracion_minutos')
      .eq('area_id', areaSeleccionada.id)
      .eq('activo', true)
      .order('nombre');
    recursos = recursosData ?? [];

    if (recursos.length > 0) {
      const recursoIds = recursos.map((r) => r.id);
      const { desde: inicioDia, hasta: finDia } = limitesDiaLocalUtc(fecha);

      const [{ data: franjasTodas }, { data: ocupados }, { data: bloqueos }] = await Promise.all([
        supabase
          .from('disponibilidad')
          .select('recurso_id, dia_semana, hora_desde, hora_hasta')
          .in('recurso_id', recursoIds),
        // RPC en vez de select directo a turno: "veo mis turnos" solo
        // deja ver los propios (o los del área si sos staff) — un socio
        // común no vería los turnos de otras personas y la grilla
        // mostraría todo como libre. horarios_ocupados() expone solo el
        // rango horario y si es tuyo, nada más.
        supabase.rpc('horarios_ocupados', {
          p_recurso_ids: recursoIds,
          p_desde: inicioDia,
          p_hasta: finDia,
        }),
        supabase
          .from('bloqueo')
          .select('recurso_id, desde, hasta')
          .in('recurso_id', recursoIds)
          .lt('desde', finDia)
          .gt('hasta', inicioDia),
      ]);

      const celdasPorRecurso = new Map<string, Celda[]>();
      for (const r of recursos) {
        celdasPorRecurso.set(
          r.id,
          calcularCeldas({
            fecha,
            duracionMinutos: r.duracion_minutos,
            franjas: (franjasTodas ?? []).filter((f) => f.recurso_id === r.id),
            ocupados: (ocupados ?? [])
              .filter((t) => t.recurso_id === r.id)
              .map((t) => ({ inicio: t.inicio, fin: t.fin, es_mio: t.es_mio })),
            bloqueos: (bloqueos ?? [])
              .filter((b) => b.recurso_id === r.id)
              .map((b) => ({ inicio: b.desde, fin: b.hasta })),
            ahoraUtc: new Date().toISOString(),
          }),
        );
      }

      // Eje de horarios = unión de los horarios de inicio de TODOS los
      // recursos del área. Si una cancha no tiene celda a esa hora (otra
      // disponibilidad, otra duración), esa columna queda en blanco ("—").
      const horarios = new Set<string>();
      for (const celdas of celdasPorRecurso.values()) {
        for (const c of celdas) horarios.add(c.inicio);
      }

      filas = Array.from(horarios)
        .sort()
        .map((inicioISO) => ({
          horaLabel: formatearHoraLocal(inicioISO),
          celdas: Object.fromEntries(
            recursos.map((r) => [r.id, (celdasPorRecurso.get(r.id) ?? []).find((c) => c.inicio === inicioISO)]),
          ),
        }));
    }
  }

  const manana = sumarDiasLocal(hoy, 1);
  const urlPara = (f: string) => `/app/reservar?area_id=${areaId ?? ''}&fecha=${f}`;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Reservar</h1>
        <p className="text-sm text-muted-foreground">
          Elegís la cancha entera, no un lugar — juega quien quieras.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(areas ?? []).map((a) => (
          <Link
            key={a.id}
            href={`/app/reservar?area_id=${a.id}&fecha=${fecha}`}
            className={cn(buttonVariants({ variant: a.id === areaId ? 'default' : 'outline', size: 'sm' }), 'w-auto')}
          >
            {a.nombre}
          </Link>
        ))}
        {(areas?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No hay áreas activas todavía.</p>
        )}
      </div>

      {areaSeleccionada && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={urlPara(sumarDiasLocal(fecha, -1))} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-auto')}>
              ← Anterior
            </Link>
            <Link
              href={urlPara(hoy)}
              className={cn(buttonVariants({ variant: fecha === hoy ? 'default' : 'outline', size: 'sm' }), 'w-auto')}
            >
              Hoy
            </Link>
            <Link
              href={urlPara(manana)}
              className={cn(buttonVariants({ variant: fecha === manana ? 'default' : 'outline', size: 'sm' }), 'w-auto')}
            >
              Mañana
            </Link>
            <Link href={urlPara(sumarDiasLocal(fecha, 1))} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-auto')}>
              Siguiente →
            </Link>
            <SelectorFecha areaId={areaSeleccionada.id} fecha={fecha} />
          </div>

          {recursos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Esta área todavía no tiene canchas cargadas.</p>
          ) : (
            <ReservaGrid recursos={recursos} filas={filas} esSocio={esSocio} />
          )}
        </>
      )}
    </div>
  );
}
