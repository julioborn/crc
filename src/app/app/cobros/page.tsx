import { createClient } from '@/lib/supabase/server';
import { SocioPicker } from '@/components/admin/socio-picker';
import { CobroForm } from './cobro-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader, SectionLabel, ItemCard, EmptyState } from '@/components/admin/kit';
import { Search } from 'lucide-react';

export default async function CobrosPage({
  searchParams,
}: {
  searchParams: Promise<{ socio_id?: string }>;
}) {
  const { socio_id: socioId } = await searchParams;
  const supabase = await createClient();

  let socio: { id: string; numero_socio: number; grupo_familiar_id: string | null; usuario: { nombre: string; apellido: string } | null } | null = null;
  let cuotas: { id: string; tipo: string; periodo: string; monto: number; area: { nombre: string } | null }[] = [];

  if (socioId) {
    const { data } = await supabase
      .from('socio')
      .select('id, numero_socio, grupo_familiar_id, usuario:usuario_id(nombre, apellido)')
      .eq('id', socioId)
      .maybeSingle();
    socio = data;

    if (socio) {
      const filtro = socio.grupo_familiar_id
        ? `socio_id.eq.${socio.id},grupo_familiar_id.eq.${socio.grupo_familiar_id}`
        : `socio_id.eq.${socio.id}`;

      // La RLS ("mis cuotas") ya scopea esto: CD ve todas las impagas de
      // este socio, una subcomisión solo las de actividad de su área.
      const { data: cuotasData } = await supabase
        .from('cuota')
        .select('id, tipo, periodo, monto, area:area_id(nombre)')
        .or(filtro)
        .eq('estado', 'impaga')
        .order('periodo');

      cuotas = cuotasData ?? [];
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Gestión"
        title="Cobro presencial"
        description="Efectivo o transferencia. El monto siempre sale de la cuota — no se puede editar acá."
      />

      <form method="GET" className="flex items-end gap-2 rounded-xl border p-4">
        <div className="flex-1 space-y-1">
          <label className="flex items-center gap-1.5 text-sm font-medium">
            <Search className="size-3.5 text-muted-foreground" /> Buscar socio
          </label>
          <SocioPicker name="socio_id" />
        </div>
        <Button type="submit" size="sm" variant="outline" className="w-auto">
          Ver cuotas impagas
        </Button>
      </form>

      {socioId && !socio && <EmptyState>No se encontró ese socio.</EmptyState>}

      {socio && (
        <div className="space-y-3">
          <SectionLabel count={cuotas.length}>
            {`#${socio.numero_socio} ${socio.usuario?.nombre} ${socio.usuario?.apellido}`}
          </SectionLabel>
          {cuotas.length === 0 && <EmptyState>No tiene cuotas impagas que puedas cobrar vos.</EmptyState>}
          {cuotas.map((c) => (
            <ItemCard key={c.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {c.tipo === 'actividad' ? `Actividad — ${c.area?.nombre}` : 'Social'}
                </span>
                <span className="text-sm text-muted-foreground">{c.periodo}</span>
                <Badge variant="destructive">Impaga</Badge>
                <span className="ml-auto font-mono text-lg font-semibold">${c.monto}</span>
              </div>
              <CobroForm cuotaId={c.id} />
            </ItemCard>
          ))}
        </div>
      )}
    </div>
  );
}
