import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, SectionLabel, EmptyState } from '@/components/admin/kit';
import { NotificacionRow } from './notificacion-row';
import { MarcarTodasLeidasButton } from './marcar-todas-leidas-button';
import { Settings } from 'lucide-react';

export default async function NotificacionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: notificaciones } = await supabase
    .from('notificacion')
    .select('id, categoria, titulo, cuerpo, deep_link, leida_at, created_at')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const hayNoLeidas = (notificaciones ?? []).some((n) => !n.leida_at);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Notificaciones"
        title="Centro de notificaciones"
        description="Lo que te llegó, quede o no la push — el historial siempre queda acá."
        aside={
          <Link
            href="/app/notificaciones/preferencias"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
          >
            <Settings className="size-3.5" /> Preferencias
          </Link>
        }
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <SectionLabel count={notificaciones?.length ?? 0}>Historial</SectionLabel>
          {hayNoLeidas && <MarcarTodasLeidasButton />}
        </div>
        {(notificaciones ?? []).map((n) => (
          <NotificacionRow
            key={n.id}
            id={n.id}
            categoria={n.categoria}
            titulo={n.titulo}
            cuerpo={n.cuerpo}
            deepLink={n.deep_link}
            leida={!!n.leida_at}
            fechaLabel={new Date(n.created_at).toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
          />
        ))}
        {(notificaciones?.length ?? 0) === 0 && <EmptyState>Todavía no te llegó ninguna notificación.</EmptyState>}
      </div>
    </div>
  );
}
