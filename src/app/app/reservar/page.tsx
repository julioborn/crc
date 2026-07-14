import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calcularSlotsLibres } from '@/lib/reservas/slots';
import { SlotButton } from './slot-button';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default async function ReservarPage({
  searchParams,
}: {
  searchParams: Promise<{ recurso_id?: string; fecha?: string }>;
}) {
  const { recurso_id: recursoId, fecha } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: recursos } = await supabase
    .from('recurso')
    .select('id, nombre, precio_socio, precio_no_socio, duracion_minutos, area:area_id(nombre)')
    .eq('activo', true)
    .order('nombre');

  const hoy = new Date().toISOString().slice(0, 10);
  const { data: miSocio } = await supabase
    .from('socio')
    .select('id')
    .eq('usuario_id', user.id)
    .lte('fecha_alta', hoy)
    .or(`fecha_baja.is.null,fecha_baja.gte.${hoy}`)
    .maybeSingle();
  const esSocio = !!miSocio;

  const recurso = recursoId ? (recursos ?? []).find((r) => r.id === recursoId) : null;
  let slots: { inicio: string; fin: string }[] = [];

  if (recurso && fecha) {
    const inicioDia = `${fecha}T00:00:00Z`;
    const finDia = `${fecha}T23:59:59Z`;

    const [{ data: franjas }, { data: turnos }, { data: bloqueos }] = await Promise.all([
      supabase.from('disponibilidad').select('dia_semana, hora_desde, hora_hasta').eq('recurso_id', recurso.id),
      supabase
        .from('turno')
        .select('inicio, fin')
        .eq('recurso_id', recurso.id)
        .in('estado', ['pendiente_aprobacion', 'confirmado'])
        .gte('inicio', inicioDia)
        .lte('inicio', finDia),
      supabase
        .from('bloqueo')
        .select('desde, hasta')
        .eq('recurso_id', recurso.id)
        .lt('desde', finDia)
        .gt('hasta', inicioDia),
    ]);

    const ocupados = [
      ...(turnos ?? []).map((t) => ({ inicio: t.inicio, fin: t.fin })),
      ...(bloqueos ?? []).map((b) => ({ inicio: b.desde, fin: b.hasta })),
    ];

    slots = calcularSlotsLibres({
      fecha,
      duracionMinutos: recurso.duracion_minutos,
      franjas: franjas ?? [],
      ocupados,
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Reservar</h1>
        <p className="text-sm text-muted-foreground">
          Elegís la cancha entera, no un lugar — juega quien quieras.
        </p>
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Recurso</label>
          <Select name="recurso_id" defaultValue={recursoId} required>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Elegí un recurso" />
            </SelectTrigger>
            <SelectContent>
              {(recursos ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.nombre} ({r.area?.nombre})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Fecha</label>
          <input
            type="date"
            name="fecha"
            defaultValue={fecha ?? hoy}
            min={hoy}
            required
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </div>
        <Button type="submit" size="sm" className="w-auto">
          Ver horarios
        </Button>
      </form>

      {recurso && (
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="font-medium">{recurso.nombre}</p>
            {esSocio ? (
              <p className="text-sm">
                <span className="font-mono text-base font-semibold text-primary">
                  ${recurso.precio_socio}
                </span>{' '}
                <span className="text-muted-foreground line-through">
                  ${recurso.precio_no_socio}
                </span>{' '}
                <span className="text-xs text-muted-foreground">precio de socio</span>
              </p>
            ) : (
              <p className="text-sm">
                <span className="font-mono text-base font-semibold">
                  ${recurso.precio_no_socio}
                </span>{' '}
                <span className="text-xs text-muted-foreground">
                  · siendo socio pagarías ${recurso.precio_socio}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {slots.map((s) => (
              <SlotButton
                key={s.inicio}
                recursoId={recurso.id}
                inicio={s.inicio}
                fin={s.fin}
                horaLabel={s.inicio.slice(11, 16)}
              />
            ))}
            {slots.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay horarios libres ese día para este recurso.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
