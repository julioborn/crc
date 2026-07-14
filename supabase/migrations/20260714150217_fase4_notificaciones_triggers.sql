-- Disparadores de notificación (in-app + candidatas a push) para los
-- eventos inmediatos, y el generador + cron para las programadas
-- (cuota por vencer, cuota vencida, recordatorio de turno).
--
-- Todo esto SOLO escribe en `notificacion` (push_enviado=false). El
-- envío físico del push (FCM) lo hace el Edge Function push-send,
-- disparado cada 5 minutos por pg_cron vía pg_net — así el trigger de
-- INSERT/UPDATE nunca depende de que un servicio externo responda.

create extension if not exists pg_net;

alter table notificacion
  add constraint notificacion_dedupe_aviso_idx
  unique nulls not distinct (usuario_id, categoria, aviso_id);

-- 1) Aviso nuevo → destinatarios según alcance.
create or replace function notificar_aviso() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_deep_link text := '/app/avisos?id=' || new.id;
begin
  if new.alcance = 'global' then
    insert into notificacion (usuario_id, categoria, titulo, cuerpo, deep_link, aviso_id)
    select u.id, 'aviso', new.titulo, new.cuerpo, v_deep_link, new.id
    from usuario u
    where u.activo
    on conflict do nothing;
  else
    -- SELECT DISTINCT resuelve el tipo del literal 'aviso' antes de que
    -- el INSERT pueda castearlo implícito al enum — sin el cast
    -- explícito, Postgres tira "column categoria is of type
    -- notificacion_categoria but expression is of type text".
    insert into notificacion (usuario_id, categoria, titulo, cuerpo, deep_link, aviso_id)
    select distinct s.usuario_id, 'aviso'::notificacion_categoria, new.titulo, new.cuerpo, v_deep_link, new.id
    from socio_area sa
    join socio s on s.id = sa.socio_id
    where sa.area_id = new.area_id
      and (sa.fecha_baja is null or sa.fecha_baja >= current_date)
    on conflict do nothing;
  end if;

  update aviso set enviado_push = true where id = new.id;
  return new;
end;
$$;

create trigger trg_aviso_notificar
after insert on aviso
for each row execute function notificar_aviso();

-- 2) Cuota emitida → socio (o todo el grupo familiar, si es una cuota
-- de grupo) sea cual sea el camino que la generó: emitir_cuotas(),
-- alta de socio o inscripción a actividad.
create or replace function notificar_cuota_emitida() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_mes text;
  v_titulo text;
  v_cuerpo text;
  v_area_nombre text;
begin
  v_mes := (array['enero','febrero','marzo','abril','mayo','junio','julio',
                  'agosto','septiembre','octubre','noviembre','diciembre'])[extract(month from new.periodo)::int];

  if new.tipo = 'actividad' then
    select nombre into v_area_nombre from area where id = new.area_id;
    v_titulo := 'Nueva cuota: ' || coalesce(v_area_nombre, 'actividad');
  else
    v_titulo := 'Nueva cuota social';
  end if;
  v_cuerpo := 'Ya está tu cuota de ' || v_mes || ', $' || new.monto || ', vence el ' || extract(day from new.vencimiento)::int || '.';

  if new.grupo_familiar_id is not null then
    insert into notificacion (usuario_id, categoria, titulo, cuerpo, deep_link, cuota_id)
    select s.usuario_id, 'cuota_emitida', v_titulo, v_cuerpo, '/app/mis-cuotas', new.id
    from socio s
    where s.grupo_familiar_id = new.grupo_familiar_id
    on conflict do nothing;
  elsif new.socio_id is not null then
    insert into notificacion (usuario_id, categoria, titulo, cuerpo, deep_link, cuota_id)
    select s.usuario_id, 'cuota_emitida', v_titulo, v_cuerpo, '/app/mis-cuotas', new.id
    from socio s
    where s.id = new.socio_id
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger trg_cuota_notificar
after insert on cuota
for each row execute function notificar_cuota_emitida();

-- 3) Turno pasa a confirmado/rechazado (solo transición manual desde
-- pendiente_aprobacion — un turno que nace confirmado por aprobación
-- automática no dispara nada, el socio ya lo ve confirmado al reservar).
create or replace function notificar_turno_estado() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_categoria notificacion_categoria;
  v_titulo text;
  v_cuerpo text;
  v_recurso_nombre text;
begin
  if new.estado = old.estado or new.estado not in ('confirmado', 'rechazado') then
    return new;
  end if;

  select nombre into v_recurso_nombre from recurso where id = new.recurso_id;

  if new.estado = 'confirmado' then
    v_categoria := 'turno_confirmado';
    v_titulo := 'Turno confirmado';
    v_cuerpo := 'Tu turno de ' || coalesce(v_recurso_nombre, '') || ' quedó confirmado.';
  else
    v_categoria := 'turno_rechazado';
    v_titulo := 'Turno rechazado';
    v_cuerpo := 'Tu turno de ' || coalesce(v_recurso_nombre, '') || ' fue rechazado.';
  end if;

  insert into notificacion (usuario_id, categoria, titulo, cuerpo, deep_link, turno_id)
  values (new.usuario_id, v_categoria, v_titulo, v_cuerpo, '/app/mis-turnos', new.id)
  on conflict do nothing;

  return new;
end;
$$;

create trigger trg_turno_notificar
after update on turno
for each row execute function notificar_turno_estado();

-- 4) Pago acreditado (MP o presencial, cuota o turno).
create or replace function notificar_pago_acreditado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.cuota_id is not null then
    insert into notificacion (usuario_id, categoria, titulo, cuerpo, deep_link, cuota_id)
    select s.usuario_id, 'pago_acreditado', 'Pago acreditado',
           'Se acreditó el pago de $' || new.monto || '.', '/app/mis-cuotas', new.cuota_id
    from cuota c
    join socio s on s.id = c.socio_id or s.grupo_familiar_id = c.grupo_familiar_id
    where c.id = new.cuota_id
    on conflict do nothing;
  elsif new.turno_id is not null then
    insert into notificacion (usuario_id, categoria, titulo, cuerpo, deep_link, turno_id)
    select t.usuario_id, 'pago_acreditado', 'Pago acreditado',
           'Se acreditó el pago de $' || new.monto || ' de tu turno.', '/app/mis-turnos', new.turno_id
    from turno t
    where t.id = new.turno_id
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger trg_pago_notificar
after insert on pago
for each row execute function notificar_pago_acreditado();

-- 5) Programadas: cuota a 3 días de vencer, cuota vencida al día
-- siguiente, recordatorio de turno 1 hora antes. TODO en hora del
-- club, no la del servidor (Supabase corre en UTC) — vencimiento es
-- `date`, así que "hoy" hay que calcularlo explícitamente en
-- America/Argentina/Buenos_Aires; turno.inicio ya es timestamptz
-- (instante), así que la resta contra now() es correcta sin importar
-- en qué zona corra el cron.
create or replace function generar_notificaciones_programadas() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_hoy_club date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  insert into notificacion (usuario_id, categoria, titulo, cuerpo, deep_link, cuota_id)
  select coalesce(s.usuario_id, sg.usuario_id), 'cuota_por_vencer', 'Tu cuota vence en 3 días',
         'Vence el ' || extract(day from c.vencimiento)::int || '/' || extract(month from c.vencimiento)::int || ', $' || c.monto || '.',
         '/app/mis-cuotas', c.id
  from cuota c
  left join socio s on s.id = c.socio_id
  left join socio sg on sg.grupo_familiar_id = c.grupo_familiar_id and c.grupo_familiar_id is not null
  where c.estado = 'impaga'
    and c.vencimiento = v_hoy_club + 3
    and coalesce(s.usuario_id, sg.usuario_id) is not null
  on conflict do nothing;

  insert into notificacion (usuario_id, categoria, titulo, cuerpo, deep_link, cuota_id)
  select coalesce(s.usuario_id, sg.usuario_id), 'cuota_vencida', 'Tenés una cuota vencida',
         'Venció el ' || extract(day from c.vencimiento)::int || '/' || extract(month from c.vencimiento)::int || ', $' || c.monto || '.',
         '/app/mis-cuotas', c.id
  from cuota c
  left join socio s on s.id = c.socio_id
  left join socio sg on sg.grupo_familiar_id = c.grupo_familiar_id and c.grupo_familiar_id is not null
  where c.estado = 'impaga'
    and c.vencimiento = v_hoy_club - 1
    and coalesce(s.usuario_id, sg.usuario_id) is not null
  on conflict do nothing;

  insert into notificacion (usuario_id, categoria, titulo, cuerpo, deep_link, turno_id)
  select t.usuario_id, 'recordatorio_turno', 'Tu turno es en una hora',
         coalesce(r.nombre, 'Tu turno') || ' a las ' || to_char(t.inicio at time zone 'America/Argentina/Buenos_Aires', 'HH24:MI') || '.',
         '/app/mis-turnos', t.id
  from turno t
  join recurso r on r.id = t.recurso_id
  where t.estado = 'confirmado'
    and t.inicio between now() + interval '55 minutes' and now() + interval '65 minutes'
  on conflict do nothing;
end;
$$;

-- 6) Disparo del envío físico: le pega a push-send, que procesa todo
-- lo que esté con push_enviado=false. El secreto compartido vive en
-- vault, no en el código versionado.
create or replace function procesar_notificaciones_cron() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_secret text;
  v_url text;
begin
  perform generar_notificaciones_programadas();

  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_function_secret';
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_send_url';

  if v_secret is null or v_url is null then
    raise notice 'procesar_notificaciones_cron: faltan secretos en vault (push_function_secret / push_send_url), no se llama a push-send';
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := '{}'::jsonb
  );
end;
$$;

select cron.schedule('push-notificaciones', '*/5 * * * *', 'select procesar_notificaciones_cron();');
