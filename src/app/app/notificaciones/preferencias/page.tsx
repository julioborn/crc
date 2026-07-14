import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, SectionLabel } from '@/components/admin/kit';
import { PedirPermisoPush } from '@/components/notificaciones/pedir-permiso-push';
import { CATEGORIAS_CONFIGURABLES } from '@/lib/notificaciones/categorias';
import { PreferenciaToggle } from './preferencia-toggle';

export default async function PreferenciasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: preferencias } = await supabase
    .from('preferencia_notificacion')
    .select('categoria, habilitada')
    .eq('usuario_id', user.id);

  const mapa = new Map((preferencias ?? []).map((p) => [p.categoria, p.habilitada]));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Notificaciones"
        title="Preferencias"
        description="Elegí qué categorías te avisan por push. Las cuotas vencidas son institucionales y siempre se avisan."
      />

      <div className="rounded-xl border border-primary/25 bg-primary/[0.03] p-5">
        <p className="mb-2 text-sm font-medium">Notificaciones push</p>
        <PedirPermisoPush mensaje="Activar notificaciones en este dispositivo" />
      </div>

      <div className="space-y-3">
        <SectionLabel>Categorías</SectionLabel>
        <div className="space-y-2">
          {CATEGORIAS_CONFIGURABLES.map((c) => (
            <PreferenciaToggle
              key={c.valor}
              categoria={c.valor}
              habilitadaInicial={mapa.get(c.valor) ?? true}
              label={c.label}
              descripcion={c.descripcion}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Las cuotas vencidas se avisan siempre, sin excepción.</p>
      </div>
    </div>
  );
}
