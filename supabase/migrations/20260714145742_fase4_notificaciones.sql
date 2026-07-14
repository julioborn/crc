-- Fase 4: avisos y push.
-- aviso / aviso_lectura / dispositivo ya existían en el schema inicial
-- (con RLS correcta: alcance global = solo CD, alcance area = solo
-- quien gestiona esa área; edición/borrado = autor o CD). Acá se agrega
-- lo que faltaba: el historial de notificaciones (push + in-app, "la
-- push se pierde, el registro queda") y las preferencias por categoría.

create type notificacion_categoria as enum (
  'aviso',
  'cuota_emitida',
  'cuota_por_vencer',
  'cuota_vencida',
  'turno_confirmado',
  'turno_rechazado',
  'recordatorio_turno',
  'pago_acreditado'
);

create table notificacion (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuario(id) on delete cascade,
  categoria notificacion_categoria not null,
  titulo text not null,
  cuerpo text not null,
  deep_link text,
  aviso_id uuid references aviso(id) on delete set null,
  cuota_id uuid references cuota(id) on delete set null,
  turno_id uuid references turno(id) on delete set null,
  push_enviado boolean not null default false,
  leida_at timestamptz,
  created_at timestamptz not null default now()
);

create index notificacion_usuario_idx on notificacion (usuario_id, created_at desc);

-- Dedupe: el cron de recordatorios corre cada N minutos — sin esto,
-- cada corrida que vea la misma cuota/turno todavía pendiente volvería
-- a mandar el mismo aviso. Una sola fila por (usuario, categoría,
-- cuota/turno) referenciado.
create unique index notificacion_dedupe_cuota_idx on notificacion (usuario_id, categoria, cuota_id) where cuota_id is not null;
create unique index notificacion_dedupe_turno_idx on notificacion (usuario_id, categoria, turno_id) where turno_id is not null;

alter table notificacion enable row level security;

create policy "veo mis notificaciones" on notificacion
  for select using (usuario_id = auth.uid());

create policy "marco mis notificaciones leidas" on notificacion
  for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- Sin policy de insert/delete para clientes a propósito: solo el Edge
-- Function push-send escribe acá, con la service role key (bypassa RLS).
-- Un usuario no puede fabricarse notificaciones propias ni ajenas.

create table preferencia_notificacion (
  usuario_id uuid not null references usuario(id) on delete cascade,
  categoria notificacion_categoria not null,
  habilitada boolean not null default true,
  primary key (usuario_id, categoria)
);

alter table preferencia_notificacion enable row level security;

create policy "mis preferencias" on preferencia_notificacion
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

comment on table notificacion is 'Historial de notificaciones (push + in-app). categoria=cuota_vencida es institucional: push-send la manda sin mirar preferencia_notificacion.';
comment on column preferencia_notificacion.habilitada is 'Si es false, push-send no manda el push (pero igual registra en notificacion). No aplica a la categoría cuota_vencida.';
