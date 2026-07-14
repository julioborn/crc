import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { areasGestionadas, type CargoRow } from '@/lib/auth/roles';
import { formatearFechaHoraLocal, formatearHoraLocal } from '@/lib/reservas/tz';
import { club } from '@/config/club';
import { MembershipCard } from '@/components/membership-card';
import { BotonPagarMP } from '@/components/boton-pagar-mp';
import { Badge } from '@/components/ui/badge';
import { SectionLabel } from '@/components/admin/kit';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  Clock,
  Megaphone,
  Wallet,
  CalendarDays,
  Ticket,
  ClipboardCheck,
  ClipboardList,
  Banknote,
  Receipt,
  BarChart3,
  LayoutGrid,
  Shield,
  Layers,
  Landmark,
  IdCard,
  Users,
  UsersRound,
  Tag,
} from 'lucide-react';

const ESTADO_LABEL: Record<string, string> = {
  pendiente_aprobacion: 'Pendiente de aprobación',
  confirmado: 'Confirmado',
};

const GESTION_ACCESOS = [
  { href: '/app/inscripciones', icono: <ClipboardList className="size-5" />, label: 'Inscripciones' },
  { href: '/app/cobros', icono: <Banknote className="size-5" />, label: 'Cobros' },
  { href: '/app/egresos', icono: <Receipt className="size-5" />, label: 'Egresos' },
  { href: '/app/reportes', icono: <BarChart3 className="size-5" />, label: 'Reportes' },
  { href: '/app/recursos', icono: <LayoutGrid className="size-5" />, label: 'Recursos' },
  { href: '/app/panel-turnos', icono: <ClipboardCheck className="size-5" />, label: 'Panel de turnos' },
];

const ADMIN_ACCESOS = [
  { href: '/app/admin/areas', icono: <Layers className="size-5" />, label: 'Áreas' },
  { href: '/app/admin/comisiones', icono: <Landmark className="size-5" />, label: 'Comisiones' },
  { href: '/app/admin/cargos', icono: <IdCard className="size-5" />, label: 'Cargos' },
  { href: '/app/admin/socios', icono: <Users className="size-5" />, label: 'Socios' },
  { href: '/app/admin/grupos-familiares', icono: <UsersRound className="size-5" />, label: 'Grupos familiares' },
  { href: '/app/admin/aranceles', icono: <Tag className="size-5" />, label: 'Aranceles' },
];

function AccesoRapido({ href, icono, label }: { href: string; icono: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-1 flex-col items-center gap-2 rounded-xl border border-transparent bg-card p-3 text-center transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-sm"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
        {icono}
      </span>
      <span className="text-xs leading-tight font-medium">{label}</span>
    </Link>
  );
}

function KpiCard({
  href,
  icono,
  label,
  valor,
  urgente,
}: {
  href: string;
  icono: React.ReactNode;
  label: string;
  valor: number;
  urgente: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex min-w-[10rem] flex-1 items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/30',
        urgente && 'border-primary/25 bg-primary/[0.04]',
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full',
          urgente ? 'bg-primary/15 text-primary' : 'bg-ink/[0.06] text-muted-foreground',
        )}
      >
        {icono}
      </span>
      <div>
        <p className="font-display text-2xl leading-none font-bold">{valor}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Link>
  );
}

export default async function AppHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: usuario }, { data: esDirectiva }, { data: cargos }, { data: miSocio }, { data: avisos }] =
    await Promise.all([
      supabase.from('usuario').select('nombre, apellido').eq('id', user.id).single(),
      supabase.rpc('es_directiva'),
      supabase
        .from('cargo_comision')
        .select(
          `cargo, vigente_desde, vigente_hasta,
           comision:comision_id(nombre, es_directiva, mandato_desde, mandato_hasta,
             comision_area(area:area_id(id, nombre)))`,
        )
        .eq('usuario_id', user.id),
      supabase.from('socio').select('id, numero_socio, grupo_familiar_id').eq('usuario_id', user.id).maybeSingle(),
      supabase.from('aviso').select('id, titulo, cuerpo, created_at').order('created_at', { ascending: false }).limit(3),
    ]);

  const cargosData = (cargos ?? []) as unknown as CargoRow[];
  const misAreas = areasGestionadas(cargosData);
  const tieneCargo = !!esDirectiva || misAreas.length > 0;
  const nombreCompleto = usuario ? `${usuario.nombre} ${usuario.apellido}` : user.email!;

  let cuotasImpagas: {
    id: string;
    tipo: string;
    periodo: string;
    monto: number;
    vencimiento: string;
    area: { nombre: string } | null;
  }[] = [];
  let proximoTurno: {
    id: string;
    inicio: string;
    fin: string;
    estado: string;
    cobrado: boolean;
    recurso: { nombre: string; area: { nombre: string } | null } | null;
  } | null = null;

  if (miSocio) {
    const filtroCuota = miSocio.grupo_familiar_id
      ? `socio_id.eq.${miSocio.id},grupo_familiar_id.eq.${miSocio.grupo_familiar_id}`
      : `socio_id.eq.${miSocio.id}`;
    const ahora = new Date().toISOString();

    const [{ data: cuotas }, { data: turno }] = await Promise.all([
      supabase
        .from('cuota')
        .select('id, tipo, periodo, monto, vencimiento, area:area_id(nombre)')
        .or(filtroCuota)
        .eq('estado', 'impaga')
        .order('vencimiento'),
      supabase
        .from('turno')
        .select('id, inicio, fin, estado, cobrado, recurso:recurso_id(nombre, area:area_id(nombre))')
        .eq('usuario_id', user.id)
        .in('estado', ['pendiente_aprobacion', 'confirmado'])
        .gte('inicio', ahora)
        .order('inicio')
        .limit(1)
        .maybeSingle(),
    ]);

    cuotasImpagas = cuotas ?? [];
    proximoTurno = turno;
  }

  let recursosPitch: { nombre: string; precio_socio: number; precio_no_socio: number; area: { nombre: string } | null }[] = [];
  let arancelSocial: number | null = null;

  if (!miSocio) {
    const [{ data: recursos }, { data: arancel }] = await Promise.all([
      supabase
        .from('recurso')
        .select('nombre, precio_socio, precio_no_socio, area:area_id(nombre)')
        .eq('activo', true)
        .limit(3),
      supabase.from('arancel').select('monto').eq('tipo', 'social').is('vigente_hasta', null).maybeSingle(),
    ]);
    recursosPitch = recursos ?? [];
    arancelSocial = arancel?.monto ?? null;
  }

  let pendientesAprobar = 0;
  let porCobrar = 0;

  if (tieneCargo) {
    let areaIds = misAreas.map((a) => a.id);
    if (esDirectiva) {
      const { data } = await supabase.from('area').select('id');
      areaIds = (data ?? []).map((a) => a.id);
    }
    if (areaIds.length > 0) {
      const { data: recursosGestion } = await supabase.from('recurso').select('id').in('area_id', areaIds);
      const recursoIds = (recursosGestion ?? []).map((r) => r.id);
      if (recursoIds.length > 0) {
        const [{ count: cPend }, { count: cCobrar }] = await Promise.all([
          supabase
            .from('turno')
            .select('id', { count: 'exact', head: true })
            .in('recurso_id', recursoIds)
            .eq('estado', 'pendiente_aprobacion'),
          supabase
            .from('turno')
            .select('id', { count: 'exact', head: true })
            .in('recurso_id', recursoIds)
            .eq('estado', 'confirmado')
            .eq('cobrado', false),
        ]);
        pendientesAprobar = cPend ?? 0;
        porCobrar = cCobrar ?? 0;
      }
    }
  }

  const hoyLargo = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: club.timezone,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">{hoyLargo}</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Hola, {usuario?.nombre ?? nombreCompleto}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* La tarjeta más importante de la app: deuda, o que quede claro que no hay. */}
        {miSocio &&
          (cuotasImpagas.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-5 sm:col-span-2">
              <p className="font-mono text-xs tracking-widest text-destructive uppercase">
                {cuotasImpagas.length > 1 ? `${cuotasImpagas.length} cuotas impagas` : 'Cuota impaga'}
              </p>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-display text-3xl font-bold text-ink">${cuotasImpagas[0].monto}</p>
                  <p className="text-sm text-muted-foreground">
                    {cuotasImpagas[0].tipo === 'actividad' ? cuotasImpagas[0].area?.nombre : 'Cuota social'} ·
                    vence {cuotasImpagas[0].vencimiento}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <BotonPagarMP cuotaId={cuotasImpagas[0].id} />
                  {cuotasImpagas.length > 1 && (
                    <Link href="/app/mis-cuotas" className="text-xs text-muted-foreground hover:underline">
                      Ver todas ({cuotasImpagas.length})
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-5 sm:col-span-2">
              <CheckCircle className="size-8 shrink-0 text-primary" />
              <div>
                <p className="font-display text-lg font-semibold">Estás al día</p>
                <p className="text-sm text-muted-foreground">No tenés cuotas pendientes. Así se sigue.</p>
              </div>
            </div>
          ))}

        {/* Próximo turno, si tiene */}
        {proximoTurno && (
          <div className="space-y-2 rounded-lg border p-5">
            <p className="flex items-center gap-1.5 font-mono text-xs tracking-widest text-muted-foreground uppercase">
              <Clock className="size-3.5" /> Próximo turno
            </p>
            <p className="font-display text-lg font-semibold">
              {proximoTurno.recurso?.nombre}{' '}
              <span className="font-sans text-sm font-normal text-muted-foreground">
                ({proximoTurno.recurso?.area?.nombre})
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {formatearFechaHoraLocal(proximoTurno.inicio)} – {formatearHoraLocal(proximoTurno.fin)}
            </p>
            <div className="flex gap-2 pt-1">
              <Badge variant={proximoTurno.estado === 'confirmado' ? 'default' : 'secondary'}>
                {ESTADO_LABEL[proximoTurno.estado]}
              </Badge>
              <Badge variant={proximoTurno.cobrado ? 'default' : 'secondary'}>
                {proximoTurno.cobrado ? 'Cobrado' : 'Se paga en cancha'}
              </Badge>
            </div>
          </div>
        )}

        {/* Carnet real del socio */}
        {miSocio && (
          <div className="flex items-center justify-center rounded-lg border bg-muted/20 p-5">
            <MembershipCard numeroSocio={miSocio.numero_socio} nombreTitular={nombreCompleto} decorativo={false} />
          </div>
        )}

        {/* Accesos rápidos */}
        <div className="space-y-3 rounded-lg border p-5">
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Accesos rápidos</p>
          <div className="flex flex-wrap gap-2">
            <AccesoRapido href="/app/reservar" icono={<CalendarDays className="size-5" />} label="Reservar" />
            <AccesoRapido href="/app/mis-cuotas" icono={<Wallet className="size-5" />} label="Mis cuotas" />
            <AccesoRapido href="/app/mis-turnos" icono={<Ticket className="size-5" />} label="Mis turnos" />
          </div>
        </div>

        {/* Avisos */}
        <div className="space-y-3 rounded-lg border p-5 sm:col-span-2 lg:col-span-1">
          <p className="flex items-center gap-1.5 font-mono text-xs tracking-widest text-muted-foreground uppercase">
            <Megaphone className="size-3.5" /> Avisos
          </p>
          {(avisos ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Sin avisos por ahora.</p>
          )}
          <ul className="space-y-2">
            {(avisos ?? []).map((a) => (
              <li key={a.id}>
                <p className="text-sm font-medium">{a.titulo}</p>
                <p className="line-clamp-1 text-xs text-muted-foreground">{a.cuerpo}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Asociate — solo para quien todavía no es socio */}
        {!miSocio && (
          <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-5 sm:col-span-2">
            <p className="font-mono text-xs tracking-widest text-primary uppercase">Todavía no sos socio</p>
            <p className="font-display text-lg font-semibold">Lo que gana un socio</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {arancelSocial && (
                <li>
                  Cuota social desde <span className="font-mono text-foreground">${arancelSocial}</span> por mes.
                </li>
              )}
              {recursosPitch.map((r) => (
                <li key={r.nombre}>
                  {r.nombre} ({r.area?.nombre}):{' '}
                  <span className="font-mono text-foreground">${r.precio_socio}</span>{' '}
                  <span className="line-through">${r.precio_no_socio}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              El alta de socio la gestiona la administración — acercate al club para asociarte.
            </p>
          </div>
        )}

      </div>

      {/* Panel de gestión — separado del grid personal a propósito: es
          "lo que administrás", no otra tarjeta de "lo tuyo". Quien
          administra un área o toda la Directiva no debería tener que
          abrir el menú para llegar a lo que gestiona todos los días. */}
      {tieneCargo && (
        <section className="space-y-5 rounded-2xl border border-ink/10 bg-ink/[0.02] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
              <Shield className="size-4.5" />
            </span>
            <div>
              <p className="font-display text-xl font-bold tracking-tight">
                {esDirectiva ? 'Comisión Directiva' : 'Panel de gestión'}
              </p>
              <p className="text-sm text-muted-foreground">
                {esDirectiva
                  ? 'Alcance sobre todo el club.'
                  : `A cargo de ${misAreas.map((a) => a.nombre).join(', ')}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <KpiCard
              href="/app/panel-turnos"
              icono={<ClipboardCheck className="size-4.5" />}
              label={`turno${pendientesAprobar === 1 ? '' : 's'} por aprobar`}
              valor={pendientesAprobar}
              urgente={pendientesAprobar > 0}
            />
            <KpiCard
              href="/app/panel-turnos"
              icono={<Banknote className="size-4.5" />}
              label="por cobrar"
              valor={porCobrar}
              urgente={porCobrar > 0}
            />
          </div>

          <div className="space-y-3">
            <SectionLabel>Gestión</SectionLabel>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {GESTION_ACCESOS.map((g) => (
                <AccesoRapido key={g.href} href={g.href} icono={g.icono} label={g.label} />
              ))}
            </div>
          </div>

          {esDirectiva && (
            <div className="space-y-3">
              <SectionLabel>Administración</SectionLabel>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {ADMIN_ACCESOS.map((a) => (
                  <AccesoRapido key={a.href} href={a.href} icono={a.icono} label={a.label} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
