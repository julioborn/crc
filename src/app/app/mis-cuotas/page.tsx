import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BotonPagarMP } from '@/components/boton-pagar-mp';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ESTADO_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  impaga: 'destructive',
  pendiente: 'secondary',
  pagada: 'default',
  anulada: 'outline',
};

const ESTADO_LABEL: Record<string, string> = {
  impaga: 'Impaga',
  pendiente: 'Pago en proceso',
  pagada: 'Pagada',
  anulada: 'Anulada',
};

const MENSAJE_VUELTA: Record<string, string> = {
  exito: 'Pago realizado. Puede tardar unos minutos en verse reflejado acá.',
  pendiente: 'Tu pago quedó pendiente de confirmación en Mercado Pago.',
  error: 'El pago no se completó. Podés reintentarlo cuando quieras.',
};

export default async function MisCuotasPage({
  searchParams,
}: {
  searchParams: Promise<{ pago?: string }>;
}) {
  const { pago } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: miSocio } = await supabase
    .from('socio')
    .select('id, grupo_familiar_id')
    .eq('usuario_id', user.id)
    .maybeSingle();

  if (!miSocio) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Todavía no sos socio</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Cuando la administración te dé de alta como socio, tus cuotas van a
          aparecer acá.
        </CardContent>
      </Card>
    );
  }

  const filtro = miSocio.grupo_familiar_id
    ? `socio_id.eq.${miSocio.id},grupo_familiar_id.eq.${miSocio.grupo_familiar_id}`
    : `socio_id.eq.${miSocio.id}`;

  const { data: cuotas } = await supabase
    .from('cuota')
    .select(
      'id, tipo, periodo, monto, estado, vencimiento, socio_id, area:area_id(nombre), grupo_familiar:grupo_familiar_id(nombre)',
    )
    .or(filtro)
    .order('periodo', { ascending: false });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Mis cuotas</h1>
        <p className="text-sm text-muted-foreground">
          Las de tu grupo familiar las puede pagar cualquier integrante — se
          paga una vez y todos quedan al día.
        </p>
      </div>

      {pago && MENSAJE_VUELTA[pago] && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          {MENSAJE_VUELTA[pago]}
        </div>
      )}

      <div className="space-y-3">
        {(cuotas ?? []).map((c) => (
          <div key={c.id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {c.tipo === 'actividad' ? `Actividad — ${c.area?.nombre}` : 'Social'}
              </span>
              <span className="text-sm text-muted-foreground">{c.periodo}</span>
              <Badge variant={ESTADO_VARIANT[c.estado]}>{ESTADO_LABEL[c.estado]}</Badge>
              {c.grupo_familiar && (
                <span className="text-xs text-muted-foreground">
                  · cuota familiar ({c.grupo_familiar.nombre})
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <span className="font-mono text-base text-foreground">${c.monto}</span>
                {' · vence '}
                {c.vencimiento}
              </div>
              {c.estado === 'impaga' && <BotonPagarMP cuotaId={c.id} />}
              {c.estado === 'pendiente' && (
                <span className="text-xs text-muted-foreground">
                  Ya iniciaste el pago. Si no se acredita en unos minutos,
                  consultá a la administración.
                </span>
              )}
            </div>
          </div>
        ))}
        {(cuotas?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No tenés cuotas emitidas todavía.</p>
        )}
      </div>
    </div>
  );
}
