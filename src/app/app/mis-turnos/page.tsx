import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatearFechaHoraLocal, formatearHoraLocal } from '@/lib/reservas/tz';
import { CancelarButton } from './cancelar-button';
import { Badge } from '@/components/ui/badge';

const ESTADO_LABEL: Record<string, string> = {
  pendiente_aprobacion: 'Pendiente de aprobación',
  confirmado: 'Confirmado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
  ausente: 'Ausente',
};

const ESTADO_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pendiente_aprobacion: 'secondary',
  confirmado: 'default',
  rechazado: 'destructive',
  cancelado: 'outline',
  ausente: 'outline',
};

export default async function MisTurnosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const ahora = new Date().toISOString();

  const { data: turnos } = await supabase
    .from('turno')
    .select('id, inicio, fin, estado, precio, cobrado, recurso:recurso_id(nombre, area:area_id(nombre))')
    .eq('usuario_id', user.id)
    .order('inicio', { ascending: false });

  const proximos = (turnos ?? []).filter((t) => t.inicio >= ahora);
  const pasados = (turnos ?? []).filter((t) => t.inicio < ahora);

  function Fila({ t, permitirCancelar }: { t: (typeof proximos)[number]; permitirCancelar: boolean }) {
    const puedeCancelar =
      permitirCancelar && (t.estado === 'pendiente_aprobacion' || t.estado === 'confirmado');

    return (
      <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
        <div>
          <p className="font-medium">
            {t.recurso?.nombre}{' '}
            <span className="font-normal text-muted-foreground">({t.recurso?.area?.nombre})</span>
          </p>
          <p className="text-muted-foreground">
            {formatearFechaHoraLocal(t.inicio)} — {formatearHoraLocal(t.fin)}
          </p>
        </div>
        <Badge variant={ESTADO_VARIANT[t.estado]}>{ESTADO_LABEL[t.estado]}</Badge>
        <Badge variant={t.cobrado ? 'default' : 'secondary'}>
          {t.cobrado ? 'Cobrado' : 'Sin cobrar'}
        </Badge>
        <span className="font-mono">${t.precio}</span>
        {puedeCancelar && (
          <div className="ml-auto">
            <CancelarButton turnoId={t.id} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Mis turnos</h1>
        <p className="text-sm text-muted-foreground">
          El estado es la reserva. Cobrado es la plata — son cosas distintas.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Próximos</h2>
        {proximos.map((t) => (
          <Fila key={t.id} t={t} permitirCancelar />
        ))}
        {proximos.length === 0 && (
          <p className="text-sm text-muted-foreground">No tenés turnos próximos.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Pasados</h2>
        {pasados.map((t) => (
          <Fila key={t.id} t={t} permitirCancelar={false} />
        ))}
        {pasados.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no tenés turnos pasados.</p>
        )}
      </section>
    </div>
  );
}
