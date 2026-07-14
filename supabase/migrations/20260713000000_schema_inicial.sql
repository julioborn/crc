-- ============================================================
-- CRC — Centro Recreativo Calchaquí
-- Schema completo Supabase / PostgreSQL
-- ============================================================
-- Convenciones:
--   - Entidades de dominio en español, términos técnicos en inglés.
--   - Toda tabla tiene id uuid + created_at.
--   - Los montos son numeric(12,2). NUNCA float (errores de redondeo).
--   - Los períodos de cuota son date con día 1 (2026-07-01 = "julio 2026").
-- ============================================================


-- ============================================================
-- 0. EXTENSIONES Y ENUMS
-- ============================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_cron";        -- emisión mensual automática

-- Cargos posibles dentro de una comisión.
create type cargo_tipo as enum (
  'presidente', 'vicepresidente', 'secretario', 'prosecretario',
  'tesorero', 'protesorero', 'vocal', 'revisor_cuentas'
);

-- Tipo de cuota. La social la paga el socio o el grupo; la de actividad es por área.
create type cuota_tipo as enum ('social', 'actividad');

-- Estados de cuota.
--   impaga    → emitida, nadie pagó
--   pendiente → el socio inició el pago en MP, esperando confirmación del webhook
--   pagada    → confirmada
--   anulada   → la administración la dio de baja
create type cuota_estado as enum ('impaga', 'pendiente', 'pagada', 'anulada');

create type metodo_pago as enum ('mercadopago', 'efectivo', 'transferencia');

create type movimiento_tipo as enum ('ingreso', 'egreso');

-- Estado de RESERVA del turno (distinto del estado de COBRO).
create type turno_estado as enum ('pendiente_aprobacion', 'confirmado', 'rechazado', 'cancelado', 'ausente');

create type aviso_alcance as enum ('global', 'area');


-- ============================================================
-- 1. USUARIOS
-- ============================================================
-- Todo el mundo es usuario. Sin usuario no se entra a la app.
-- Esta tabla EXTIENDE auth.users de Supabase (no la reemplaza).
-- auth.users guarda mail y password; acá va el perfil del club.

create table usuario (
  id            uuid primary key references auth.users(id) on delete cascade,
  nombre        text not null,
  apellido      text not null,
  dni           text unique,
  telefono      text,
  fecha_nac     date,
  foto_url      text,
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Tokens de push (FCM). Uno-a-muchos: un usuario puede tener varios dispositivos.
create table dispositivo (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references usuario(id) on delete cascade,
  fcm_token     text not null unique,
  plataforma    text not null check (plataforma in ('android', 'ios', 'web')),
  ultimo_uso    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index on dispositivo (usuario_id);


-- ============================================================
-- 2. ESTRUCTURA DEL CLUB: ÁREAS Y COMISIONES
-- ============================================================

-- Área = unidad de gestión y de imputación contable.
-- Fútbol 5, pádel, básquet, pileta, cantina, eventos, proyectos...
create table area (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null unique,
  descripcion   text,
  -- ¿Los socios se pueden inscribir a esta área y pagar un adicional?
  -- La cantina no (nadie se "inscribe" a la cantina). El básquet sí.
  es_inscribible boolean not null default false,
  activa        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Comisión = grupo de personas con mandato.
-- La Comisión Directiva General es UNA COMISIÓN MÁS, pero con es_directiva = true.
-- Esa flag es la que le da alcance global (ve y maneja todo).
create table comision (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  es_directiva  boolean not null default false,
  mandato_desde date not null,
  mandato_hasta date not null,
  created_at    timestamptz not null default now(),
  check (mandato_hasta > mandato_desde)
);

-- Solo puede haber UNA comisión directiva vigente a la vez.
-- (Índice parcial: la restricción solo aplica a las que tienen es_directiva = true.)
create unique index una_directiva_vigente
  on comision (es_directiva, mandato_desde)
  where es_directiva = true;

-- Qué áreas maneja cada comisión. Muchos a muchos.
-- Una subcomisión puede manejar fútbol 5 Y pádel.
-- La CD general NO necesita filas acá: su alcance es global por la flag.
create table comision_area (
  comision_id   uuid not null references comision(id) on delete cascade,
  area_id       uuid not null references area(id) on delete cascade,
  primary key (comision_id, area_id)
);

-- ACÁ VIVE EL PERMISO.
-- Un usuario tiene un cargo, en una comisión, durante una vigencia PROPIA.
-- La vigencia propia existe porque alguien renuncia a mitad de mandato,
-- entra un suplente, o cambia de cargo. El mandato es de la comisión;
-- la vigencia es de la persona.
create table cargo_comision (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references usuario(id) on delete restrict,
  comision_id   uuid not null references comision(id) on delete cascade,
  cargo         cargo_tipo not null,
  vigente_desde date not null,
  vigente_hasta date,                       -- null = sigue vigente
  created_at    timestamptz not null default now(),
  check (vigente_hasta is null or vigente_hasta > vigente_desde)
);
create index on cargo_comision (usuario_id);
create index on cargo_comision (comision_id);


-- ============================================================
-- 3. SOCIOS Y GRUPOS FAMILIARES
-- ============================================================

-- Grupo familiar: tarifa PLANA. Recibe UNA SOLA cuota social.
-- Cualquier integrante la puede pagar; se paga una vez y todos quedan al día.
create table grupo_familiar (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,             -- "Familia Canciani"
  titular_id    uuid,                      -- referencia a socio, se agrega abajo (circular)
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Socio = CONDICIÓN habilitada por la administración sobre un usuario existente.
-- No es un tipo de cuenta. Un usuario reserva pádel hoy, se asocia el año que viene,
-- y NO pierde su historial: se le engancha la condición a la cuenta que ya tenía.
create table socio (
  id                uuid primary key default gen_random_uuid(),
  usuario_id        uuid not null unique references usuario(id) on delete restrict,
  numero_socio      integer not null unique,
  grupo_familiar_id uuid references grupo_familiar(id) on delete set null,

  -- LA FECHA DE ALTA MANDA. Determina la primera cuota.
  -- Puede ser FUTURA: dar de alta el 20/07 con fecha 01/08 = no paga julio.
  -- La secretaría decide, el código no.
  fecha_alta        date not null,
  fecha_baja        date,

  created_at        timestamptz not null default now(),
  check (fecha_baja is null or fecha_baja >= fecha_alta)
);
create index on socio (grupo_familiar_id);

alter table grupo_familiar
  add constraint fk_titular foreign key (titular_id) references socio(id) on delete set null;

-- Inscripción de un socio a un área (básquet, natación...).
-- Genera el ADICIONAL individual. No entra en el descuento familiar.
create table socio_area (
  id            uuid primary key default gen_random_uuid(),
  socio_id      uuid not null references socio(id) on delete cascade,
  area_id       uuid not null references area(id) on delete restrict,
  fecha_alta    date not null,             -- misma lógica que el socio: la fecha manda
  fecha_baja    date,
  created_at    timestamptz not null default now(),
  check (fecha_baja is null or fecha_baja >= fecha_alta)
);
-- Un socio no puede estar inscripto dos veces al mismo área AL MISMO TIEMPO.
create unique index socio_area_activa
  on socio_area (socio_id, area_id)
  where fecha_baja is null;


-- ============================================================
-- 4. ARANCELES (precios vigentes)
-- ============================================================
-- Tabla de precios CON VIGENCIA. Nunca se edita un arancel: se cierra el viejo
-- y se crea uno nuevo. Así el histórico queda intacto.
--
--   tipo = 'social'          → area_id null  → cuota del socio individual
--   tipo = 'social_familiar' → area_id null  → tarifa plana del grupo
--   tipo = 'actividad'       → area_id NOT NULL → adicional por área

create table arancel (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null check (tipo in ('social', 'social_familiar', 'actividad')),
  area_id       uuid references area(id) on delete restrict,
  monto         numeric(12,2) not null check (monto >= 0),
  vigente_desde date not null,
  vigente_hasta date,                      -- null = vigente
  created_at    timestamptz not null default now(),
  check (
    (tipo = 'actividad' and area_id is not null) or
    (tipo in ('social','social_familiar') and area_id is null)
  )
);


-- ============================================================
-- 5. CUOTAS
-- ============================================================
-- El titular de la cuota es UN SOCIO **o** UN GRUPO FAMILIAR, nunca los dos.
--
-- CRÍTICO: la cuota guarda el MONTO EN PESOS, copiado al emitirse.
-- No un arancel_id. Si en agosto suben el precio, las cuotas de julio impagas
-- NO pueden cambiar de monto solas. Con inflación argentina esto no es teórico.

create table cuota (
  id                uuid primary key default gen_random_uuid(),
  tipo              cuota_tipo not null,

  socio_id          uuid references socio(id) on delete restrict,
  grupo_familiar_id uuid references grupo_familiar(id) on delete restrict,
  area_id           uuid references area(id) on delete restrict,  -- solo si tipo='actividad'

  periodo           date not null,          -- siempre día 1: 2026-07-01
  monto             numeric(12,2) not null check (monto > 0),  -- CONGELADO
  vencimiento       date not null,
  estado            cuota_estado not null default 'impaga',

  created_at        timestamptz not null default now(),

  -- Titular: socio XOR grupo. Uno de los dos, nunca ambos, nunca ninguno.
  check (
    (socio_id is not null and grupo_familiar_id is null) or
    (socio_id is null and grupo_familiar_id is not null)
  ),
  -- Las cuotas de actividad son SIEMPRE individuales y SIEMPRE tienen área.
  check (
    (tipo = 'actividad' and area_id is not null and socio_id is not null) or
    (tipo = 'social' and area_id is null)
  )
);

-- IDEMPOTENCIA DE LA EMISIÓN.
-- El cron del día 1 y el alta a mitad de mes escriben en la MISMA tabla.
-- Sin estos índices, tarde o temprano hay cuotas duplicadas.
create unique index cuota_social_socio_unica
  on cuota (socio_id, periodo)
  where tipo = 'social' and socio_id is not null and estado <> 'anulada';

create unique index cuota_social_grupo_unica
  on cuota (grupo_familiar_id, periodo)
  where tipo = 'social' and grupo_familiar_id is not null and estado <> 'anulada';

create unique index cuota_actividad_unica
  on cuota (socio_id, area_id, periodo)
  where tipo = 'actividad' and estado <> 'anulada';

create index on cuota (estado, periodo);


-- ============================================================
-- 6. PAGOS
-- ============================================================
-- Un pago cancela una cuota O un turno.
-- La idempotency_key evita el problema clásico de Mercado Pago:
-- el webhook a veces llega DOS VECES. Sin esto, la cuota se paga dos veces
-- y el ingreso se duplica en la contabilidad del área.

create table pago (
  id                uuid primary key default gen_random_uuid(),
  cuota_id          uuid references cuota(id) on delete restrict,
  turno_id          uuid,                   -- FK se agrega tras crear turno
  metodo            metodo_pago not null,
  monto             numeric(12,2) not null check (monto > 0),
  fecha             timestamptz not null default now(),

  -- Datos de Mercado Pago
  mp_payment_id     text unique,            -- id de MP; unique = idempotencia natural
  idempotency_key   text unique,
  mp_status         text,

  -- Si fue en efectivo/transferencia: quién lo registró en secretaría
  registrado_por    uuid references usuario(id) on delete set null,
  comprobante_url   text,
  observaciones     text,

  created_at        timestamptz not null default now(),
  check (
    (cuota_id is not null and turno_id is null) or
    (cuota_id is null and turno_id is not null)
  )
);


-- ============================================================
-- 7. MOVIMIENTOS (la caja)
-- ============================================================
-- LA DOBLE IMPUTACIÓN. Este es el corazón del modelo contable.
--   comision_id → QUIÉN lo registró (la subcomisión que actuó)
--   area_id     → A QUÉ se imputa
--
-- Una subcomisión que maneja fútbol 5 Y pádel compra pelotas de pádel:
--   comision_id = "Subcomisión Deportes", area_id = "Pádel".
--
-- Eso te da los tres cortes gratis:
--   - Por área: cuánto genera y gasta el pádel.
--   - Por subcomisión: qué movió esta gente.
--   - Global: la CD ve todo.

create table movimiento (
  id            uuid primary key default gen_random_uuid(),
  tipo          movimiento_tipo not null,
  monto         numeric(12,2) not null check (monto > 0),
  fecha         date not null default current_date,
  concepto      text not null,

  comision_id   uuid not null references comision(id) on delete restrict,

  -- area_id NULLABLE. La jerarquía real del club:
  --   NULL          → es del CLUB. Cuota social, luz, contador, sueldos,
  --                   mantenimiento general. Lo registra la CD General.
  --   <area>        → es de esa área. Turnos de pádel, pelotas de básquet.
  --                   Lo registra la subcomisión que maneja el área.
  --
  -- LA PLATA ES UNA SOLA (fondo común del club). area_id y comision_id
  -- NO son "dónde está la plata": son DIMENSIONES DE ANÁLISIS.
  -- La caja está toda junta; el registro está desagregado.
  --
  -- Y por eso la CD ve todo sin transferir nada: es la misma tabla,
  -- la CD simplemente no tiene filtro.
  area_id       uuid references area(id) on delete restrict,

  usuario_id    uuid not null references usuario(id) on delete restrict,  -- responsable

  -- Si el movimiento nació de un pago, queda trazado (y NO se carga a mano).
  pago_id       uuid unique references pago(id) on delete set null,

  comprobante_url text,
  created_at    timestamptz not null default now()
);
create index on movimiento (area_id, fecha);
create index on movimiento (comision_id, fecha);


-- ============================================================
-- 8. TURNOS
-- ============================================================
-- El RECURSO es la cancha entera, no el cupo.
-- Uno reserva pádel y juegan 4; uno reserva fútbol 5 y juegan 10.
-- Al sistema no le importan los otros 3 o 9.

create table recurso (
  id                    uuid primary key default gen_random_uuid(),
  nombre                text not null,     -- "Cancha de pádel 1"
  area_id               uuid not null references area(id) on delete restrict,

  precio_socio          numeric(12,2) not null check (precio_socio >= 0),
  precio_no_socio       numeric(12,2) not null check (precio_no_socio >= 0),

  -- EL SWITCH. Por recurso, no global: el pádel puede ser automático
  -- y el quincho manual. Lo togglea quien administra esa área.
  aprobacion_automatica boolean not null default true,

  duracion_minutos      integer not null default 60,
  activo                boolean not null default true,
  created_at            timestamptz not null default now()
);

-- Franjas horarias en las que el recurso se puede reservar.
create table disponibilidad (
  id            uuid primary key default gen_random_uuid(),
  recurso_id    uuid not null references recurso(id) on delete cascade,
  dia_semana    integer not null check (dia_semana between 0 and 6),  -- 0=domingo
  hora_desde    time not null,
  hora_hasta    time not null,
  check (hora_hasta > hora_desde)
);

-- Bloqueos puntuales: feriado, torneo, mantenimiento.
create table bloqueo (
  id            uuid primary key default gen_random_uuid(),
  recurso_id    uuid not null references recurso(id) on delete cascade,
  desde         timestamptz not null,
  hasta         timestamptz not null,
  motivo        text,
  check (hasta > desde)
);

-- DOS ESTADOS QUE NO HAY QUE CONFUNDIR:
--   estado  → la RESERVA (pendiente / confirmado / rechazado / cancelado)
--   cobrado → la PLATA (el turno se paga presencial al llegar)
create table turno (
  id            uuid primary key default gen_random_uuid(),
  recurso_id    uuid not null references recurso(id) on delete restrict,
  usuario_id    uuid not null references usuario(id) on delete restrict,  -- titular

  inicio        timestamptz not null,
  fin           timestamptz not null,

  estado        turno_estado not null default 'pendiente_aprobacion',

  -- El precio se CONGELA al reservar (misma lógica que la cuota).
  precio        numeric(12,2) not null check (precio >= 0),
  era_socio     boolean not null,           -- si aplicó tarifa de socio

  cobrado       boolean not null default false,
  cobrado_por   uuid references usuario(id) on delete set null,
  cobrado_at    timestamptz,

  aprobado_por  uuid references usuario(id) on delete set null,
  created_at    timestamptz not null default now(),
  check (fin > inicio)
);
create index on turno (recurso_id, inicio);
create index on turno (usuario_id);

-- ANTI-SOLAPAMIENTO A NIVEL BASE DE DATOS.
-- Esto es lo que impide dos reservas encimadas cuando dos socios tocan
-- "reservar" en el mismo segundo. Validarlo solo en el frontend NO alcanza.
create extension if not exists btree_gist;
alter table turno add constraint turno_sin_solapamiento
  exclude using gist (
    recurso_id with =,
    tstzrange(inicio, fin) with &&
  ) where (estado in ('pendiente_aprobacion', 'confirmado'));

alter table pago add constraint fk_pago_turno
  foreign key (turno_id) references turno(id) on delete restrict;


-- ============================================================
-- 9. AVISOS
-- ============================================================

create table aviso (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  cuerpo        text not null,
  alcance       aviso_alcance not null,
  area_id       uuid references area(id) on delete cascade,  -- null si es global

  comision_id   uuid not null references comision(id) on delete restrict,  -- emisora
  usuario_id    uuid not null references usuario(id) on delete restrict,   -- quién lo mandó

  imagen_url    text,
  enviado_push  boolean not null default false,
  created_at    timestamptz not null default now(),

  check (
    (alcance = 'global' and area_id is null) or
    (alcance = 'area' and area_id is not null)
  )
);

create table aviso_lectura (
  aviso_id      uuid not null references aviso(id) on delete cascade,
  usuario_id    uuid not null references usuario(id) on delete cascade,
  leido_at      timestamptz not null default now(),
  primary key (aviso_id, usuario_id)
);


-- ============================================================
-- 10. FUNCIONES DE PERMISO
-- ============================================================
-- Toda la seguridad se apoya en estas dos funciones.
-- La regla es una sola: EL CARGO DICE QUÉ, EL ÁREA DICE DÓNDE.

-- ¿El usuario actual es miembro VIGENTE de la Comisión Directiva General?
-- Vigente = su cargo_comision está activo HOY. Si venció, pierde el acceso solo.
-- No hay que acordarse de desactivar a nadie a mano.
create or replace function es_directiva()
returns boolean language sql stable security definer as $$
  select exists (
    select 1
    from cargo_comision cc
    join comision c on c.id = cc.comision_id
    where cc.usuario_id = auth.uid()
      and c.es_directiva = true
      and cc.vigente_desde <= current_date
      and (cc.vigente_hasta is null or cc.vigente_hasta >= current_date)
      and c.mandato_desde <= current_date
      and c.mandato_hasta >= current_date
  );
$$;

-- ¿El usuario actual puede gestionar esta área?
-- Sí si: es de la CD general (alcance global), O tiene cargo vigente
-- en una comisión que tenga asignada esa área.
create or replace function puede_gestionar_area(p_area_id uuid)
returns boolean language sql stable security definer as $$
  select es_directiva() or exists (
    select 1
    from cargo_comision cc
    join comision c on c.id = cc.comision_id
    join comision_area ca on ca.comision_id = c.id
    where cc.usuario_id = auth.uid()
      and ca.area_id = p_area_id
      and cc.vigente_desde <= current_date
      and (cc.vigente_hasta is null or cc.vigente_hasta >= current_date)
      and c.mandato_desde <= current_date
      and c.mandato_hasta >= current_date
  );
$$;

-- ¿El usuario actual es el socio dueño de esta cuota?
-- Contempla el grupo familiar: CUALQUIERA de los 4 integrantes ve
-- (y puede pagar) la cuota del grupo.
create or replace function es_mi_cuota(p_cuota_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1
    from cuota q
    join socio s on s.usuario_id = auth.uid()
    where q.id = p_cuota_id
      and (q.socio_id = s.id or q.grupo_familiar_id = s.grupo_familiar_id)
  );
$$;


-- ============================================================
-- 11. ROW LEVEL SECURITY
-- ============================================================

alter table usuario         enable row level security;
alter table dispositivo     enable row level security;
alter table area            enable row level security;
alter table comision        enable row level security;
alter table comision_area   enable row level security;
alter table cargo_comision  enable row level security;
alter table grupo_familiar  enable row level security;
alter table socio           enable row level security;
alter table socio_area      enable row level security;
alter table arancel         enable row level security;
alter table cuota           enable row level security;
alter table pago            enable row level security;
alter table movimiento      enable row level security;
alter table recurso         enable row level security;
alter table disponibilidad  enable row level security;
alter table bloqueo         enable row level security;
alter table turno           enable row level security;
alter table aviso           enable row level security;
alter table aviso_lectura   enable row level security;

-- --- USUARIO ---
create policy "veo mi perfil" on usuario for select
  using (id = auth.uid() or es_directiva());
create policy "edito mi perfil" on usuario for update
  using (id = auth.uid());

-- --- DISPOSITIVO ---
create policy "mis dispositivos" on dispositivo for all
  using (usuario_id = auth.uid());

-- --- ÁREAS Y RECURSOS: lectura pública (todo usuario logueado ve la oferta) ---
create policy "areas visibles" on area for select using (true);
create policy "areas admin" on area for all using (es_directiva());

create policy "recursos visibles" on recurso for select using (true);
create policy "recursos gestion" on recurso for all
  using (puede_gestionar_area(area_id));

create policy "disponibilidad visible" on disponibilidad for select using (true);
create policy "bloqueos visibles" on bloqueo for select using (true);

-- --- COMISIONES: la CD manda ---
create policy "comisiones visibles" on comision for select using (true);
create policy "comisiones admin" on comision for all using (es_directiva());
create policy "comision_area admin" on comision_area for all using (es_directiva());
create policy "cargos visibles" on cargo_comision for select using (true);
create policy "cargos admin" on cargo_comision for all using (es_directiva());

-- --- SOCIOS: la administración habilita, el socio se ve a sí mismo ---
create policy "veo mi socio" on socio for select
  using (usuario_id = auth.uid() or es_directiva());
create policy "admin socios" on socio for all using (es_directiva());

create policy "veo mi grupo" on grupo_familiar for select
  using (es_directiva() or exists (
    select 1 from socio s
    where s.usuario_id = auth.uid() and s.grupo_familiar_id = grupo_familiar.id
  ));
create policy "admin grupos" on grupo_familiar for all using (es_directiva());

create policy "veo mis actividades" on socio_area for select
  using (es_directiva() or puede_gestionar_area(area_id) or exists (
    select 1 from socio s where s.id = socio_area.socio_id and s.usuario_id = auth.uid()
  ));
create policy "admin actividades" on socio_area for all using (es_directiva());

-- --- ARANCELES ---
create policy "aranceles visibles" on arancel for select using (true);
create policy "aranceles admin" on arancel for all using (es_directiva());

-- --- CUOTAS: cada uno ve la suya (o la de su grupo) ---
create policy "mis cuotas" on cuota for select
  using (
    es_directiva()
    or (area_id is not null and puede_gestionar_area(area_id))
    or es_mi_cuota(id)
  );
create policy "admin cuotas" on cuota for all using (es_directiva());

-- --- PAGOS ---
create policy "mis pagos" on pago for select
  using (es_directiva() or (cuota_id is not null and es_mi_cuota(cuota_id)));
create policy "registrar pago presencial" on pago for insert
  with check (es_directiva());

-- --- MOVIMIENTOS: EL CORAZÓN DE LA SEGURIDAD ---
-- Solo podés ver/registrar movimientos de un área que tu comisión maneja.
-- El de básquet no toca la plata del pádel. La CD ve todo.
-- area_id NULL = movimiento general del club → SOLO la CD General.
-- area_id <x>  = movimiento de un área → la subcomisión que la maneja, Y la CD.
create policy "movimientos de mi area" on movimiento for select
  using (
    case when area_id is null
      then es_directiva()
      else puede_gestionar_area(area_id)   -- esta función ya incluye a la CD
    end
  );
create policy "registro movimientos de mi area" on movimiento for insert
  with check (
    usuario_id = auth.uid() and
    case when area_id is null then es_directiva() else puede_gestionar_area(area_id) end
  );
create policy "edito movimientos de mi area" on movimiento for update
  using (
    case when area_id is null then es_directiva() else puede_gestionar_area(area_id) end
  );

-- --- TURNOS ---
create policy "veo mis turnos" on turno for select
  using (
    usuario_id = auth.uid()
    or exists (select 1 from recurso r where r.id = turno.recurso_id and puede_gestionar_area(r.area_id))
  );
create policy "reservo turno" on turno for insert
  with check (usuario_id = auth.uid());
create policy "gestiono turnos de mi area" on turno for update
  using (exists (
    select 1 from recurso r where r.id = turno.recurso_id and puede_gestionar_area(r.area_id)
  ));

-- --- AVISOS ---
create policy "veo avisos" on aviso for select using (true);
create policy "publico avisos de mi area" on aviso for insert
  with check (
    (alcance = 'global' and es_directiva())
    or (alcance = 'area' and puede_gestionar_area(area_id))
  );
create policy "mis lecturas" on aviso_lectura for all
  using (usuario_id = auth.uid());


-- ============================================================
-- 12. EMISIÓN AUTOMÁTICA DE CUOTAS
-- ============================================================
-- DOS DISPARADORES, UNA SOLA TABLA:
--   1. Cron del día 1  → emite a todos los socios con alta vigente.
--   2. Alta a mitad de mes → emite la cuota de ese mes en el acto.
--
-- Los índices únicos de arriba hacen que esto sea IDEMPOTENTE:
-- si la cuota ya existe, el ON CONFLICT la saltea. El cron se puede
-- correr diez veces y no duplica nada.

create or replace function emitir_cuotas(p_periodo date default date_trunc('month', current_date)::date)
returns integer language plpgsql security definer as $$
declare
  v_monto_social   numeric(12,2);
  v_monto_familiar numeric(12,2);
  v_vencimiento    date := p_periodo + interval '9 days';
  v_emitidas       integer := 0;
begin
  select monto into v_monto_social from arancel
    where tipo = 'social' and vigente_desde <= p_periodo
      and (vigente_hasta is null or vigente_hasta >= p_periodo)
    order by vigente_desde desc limit 1;

  select monto into v_monto_familiar from arancel
    where tipo = 'social_familiar' and vigente_desde <= p_periodo
      and (vigente_hasta is null or vigente_hasta >= p_periodo)
    order by vigente_desde desc limit 1;

  -- 1) Cuota social de socios SIN grupo familiar.
  --    El monto se COPIA acá. Queda congelado para siempre.
  insert into cuota (tipo, socio_id, periodo, monto, vencimiento)
  select 'social', s.id, p_periodo, v_monto_social, v_vencimiento
  from socio s
  where s.grupo_familiar_id is null
    and s.fecha_alta <= (p_periodo + interval '1 month' - interval '1 day')
    and (s.fecha_baja is null or s.fecha_baja >= p_periodo)
  on conflict do nothing;
  get diagnostics v_emitidas = row_count;

  -- 2) UNA sola cuota por grupo familiar (tarifa plana).
  --    Cualquiera de los integrantes la puede pagar. Se paga una vez.
  insert into cuota (tipo, grupo_familiar_id, periodo, monto, vencimiento)
  select 'social', g.id, p_periodo, v_monto_familiar, v_vencimiento
  from grupo_familiar g
  where g.activo = true
    and exists (
      select 1 from socio s
      where s.grupo_familiar_id = g.id
        and s.fecha_alta <= (p_periodo + interval '1 month' - interval '1 day')
        and (s.fecha_baja is null or s.fecha_baja >= p_periodo)
    )
  on conflict do nothing;

  -- 3) Adicionales por actividad. SIEMPRE individuales,
  --    NO entran en el descuento familiar.
  insert into cuota (tipo, socio_id, area_id, periodo, monto, vencimiento)
  select 'actividad', sa.socio_id, sa.area_id, p_periodo, a.monto, v_vencimiento
  from socio_area sa
  join lateral (
    select monto from arancel ar
    where ar.tipo = 'actividad' and ar.area_id = sa.area_id
      and ar.vigente_desde <= p_periodo
      and (ar.vigente_hasta is null or ar.vigente_hasta >= p_periodo)
    order by ar.vigente_desde desc limit 1
  ) a on true
  where sa.fecha_alta <= (p_periodo + interval '1 month' - interval '1 day')
    and (sa.fecha_baja is null or sa.fecha_baja >= p_periodo)
  on conflict do nothing;

  return v_emitidas;
end;
$$;

-- Cron: día 1 de cada mes, 03:00.
select cron.schedule('emitir-cuotas-mensuales', '0 3 1 * *', $$select emitir_cuotas();$$);


-- ============================================================
-- 13. EL PAGO GENERA EL MOVIMIENTO SOLO
-- ============================================================
-- Nadie carga ingresos a mano.
--   Cuota de básquet pagada  → ingreso imputado al área BÁSQUET.
--   Cuota social pagada      → ingreso imputado a la CD general.
--   Turno de pádel cobrado   → ingreso imputado al área PÁDEL.
-- El básquet ve entrar su propia plata. La CD ve todo consolidado.

create or replace function generar_movimiento_de_pago()
returns trigger language plpgsql security definer as $$
declare
  v_area_id     uuid;
  v_comision_id uuid;
  v_concepto    text;
begin
  if new.cuota_id is not null then
    -- Cuota SOCIAL   → c.area_id es NULL → imputa al club (CD General).
    -- Cuota ACTIVIDAD→ c.area_id es el área → imputa a esa área.
    select c.area_id, 'Cuota ' || c.tipo || ' ' || to_char(c.periodo, 'MM/YYYY')
    into v_area_id, v_concepto
    from cuota c where c.id = new.cuota_id;

    update cuota set estado = 'pagada' where id = new.cuota_id;

  elsif new.turno_id is not null then
    select r.area_id, 'Turno ' || r.nombre
    into v_area_id, v_concepto
    from turno t join recurso r on r.id = t.recurso_id
    where t.id = new.turno_id;

    update turno set cobrado = true, cobrado_at = now() where id = new.turno_id;
  end if;

  -- ¿Quién queda registrado como la comisión que cobró?
  --   Sin área (cuota social)  → la CD General. Va directo a la cabeza.
  --   Con área                 → la subcomisión que maneja esa área.
  --                              Si ninguna la maneja todavía, cae a la CD.
  if v_area_id is null then
    select id into v_comision_id from comision
    where es_directiva = true
      and mandato_desde <= current_date and mandato_hasta >= current_date
    limit 1;
  else
    select coalesce(
      (select ca.comision_id from comision_area ca
       join comision c on c.id = ca.comision_id
       where ca.area_id = v_area_id
         and c.mandato_desde <= current_date and c.mandato_hasta >= current_date
       limit 1),
      (select id from comision where es_directiva = true
         and mandato_desde <= current_date and mandato_hasta >= current_date limit 1)
    ) into v_comision_id;
  end if;

  insert into movimiento (tipo, monto, concepto, comision_id, area_id, usuario_id, pago_id)
  values ('ingreso', new.monto, v_concepto, v_comision_id, v_area_id,
          coalesce(new.registrado_por, auth.uid()), new.id);

  return new;
end;
$$;

create trigger trg_pago_movimiento
  after insert on pago
  for each row execute function generar_movimiento_de_pago();


-- ============================================================
-- 14. APROBACIÓN AUTOMÁTICA DE TURNOS
-- ============================================================
-- El switch del recurso decide. Si aprobacion_automatica = true,
-- el turno nace confirmado. Si no, queda esperando a un admin del área.

create or replace function aplicar_aprobacion_automatica()
returns trigger language plpgsql as $$
begin
  if (select aprobacion_automatica from recurso where id = new.recurso_id) then
    new.estado := 'confirmado';
  end if;
  return new;
end;
$$;

create trigger trg_turno_aprobacion
  before insert on turno
  for each row execute function aplicar_aprobacion_automatica();
