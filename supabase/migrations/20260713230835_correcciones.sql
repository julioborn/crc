-- ============================================================
-- CRC — Migración correctiva 002
-- Corrige los hallazgos de la auditoría del schema inicial.
-- ============================================================


-- ============================================================
-- FIX 1 (CRÍTICO) — Trigger auth.users → usuario
-- ============================================================
-- Sin esto, alguien se registra, existe en auth.users, pero NO tiene
-- fila en public.usuario. Toda la RLS que joinea usuario/socio se cae
-- EN SILENCIO: no hay error, simplemente no ve nada y nadie entiende por qué.
--
-- El nombre y apellido vienen del metadata que manda el formulario de registro:
--   supabase.auth.signUp({ email, password,
--     options: { data: { nombre: '...', apellido: '...' } } })

create or replace function handle_nuevo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.usuario (id, nombre, apellido, telefono)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    new.raw_user_meta_data->>'telefono'
  )
  on conflict (id) do nothing;   -- idempotente
  return new;
end;
$$;

create trigger trg_nuevo_usuario
  after insert on auth.users
  for each row execute function handle_nuevo_usuario();

-- Permite que el usuario complete su perfil después del registro.
create policy "creo mi perfil" on usuario for insert
  with check (id = auth.uid());


-- ============================================================
-- FIX 2 — Pagos presenciales: el tesorero de área también cobra
-- ============================================================
-- La policy vieja decía solo es_directiva(), lo que contradecía la regla
-- del dominio: "el cargo dice QUÉ, el área dice DÓNDE".
-- Un tesorero de básquet TIENE que poder cobrar presencial lo de su área.

drop policy if exists "registrar pago presencial" on pago;
drop policy if exists "mis pagos" on pago;

-- ¿Puede este usuario cobrar este pago?
--   Cuota social  → área NULL → solo la CD.
--   Cuota actividad → el área de la cuota.
--   Turno → el área del recurso.
create or replace function puede_cobrar(p_cuota_id uuid, p_turno_id uuid)
returns boolean language sql stable security definer as $$
  select case
    when p_cuota_id is not null then (
      select case
        when c.area_id is null then es_directiva()
        else puede_gestionar_area(c.area_id)
      end
      from cuota c where c.id = p_cuota_id
    )
    when p_turno_id is not null then (
      select puede_gestionar_area(r.area_id)
      from turno t join recurso r on r.id = t.recurso_id
      where t.id = p_turno_id
    )
    else false
  end;
$$;

create policy "registro pago de mi area" on pago for insert
  with check (puede_cobrar(cuota_id, turno_id));

-- FIX 6 — El socio ahora ve TODOS sus pagos, también los de turnos.
create policy "veo mis pagos" on pago for select
  using (
    es_directiva()
    or (cuota_id is not null and es_mi_cuota(cuota_id))
    or (turno_id is not null and exists (
      select 1 from turno t where t.id = pago.turno_id and t.usuario_id = auth.uid()
    ))
    or (cuota_id is not null and exists (
      select 1 from cuota c where c.id = pago.cuota_id
        and c.area_id is not null and puede_gestionar_area(c.area_id)
    ))
    or (turno_id is not null and exists (
      select 1 from turno t join recurso r on r.id = t.recurso_id
      where t.id = pago.turno_id and puede_gestionar_area(r.area_id)
    ))
  );


-- ============================================================
-- FIX 3 — Mandatos de la CD que se solapan
-- ============================================================
-- El índice viejo solo impedía dos filas con el mismo mandato_desde.
-- Si cargaban la próxima CD arrancando antes de que venciera la actual,
-- quedaban DOS directivas vigentes, y el trigger de movimientos elegía
-- una arbitraria (LIMIT 1 sin ORDER BY). En una asamblea, esa es
-- exactamente la pregunta incómoda: "¿quién registró esto?".

drop index if exists una_directiva_vigente;

alter table comision add constraint directiva_sin_solapamiento
  exclude using gist (
    daterange(mandato_desde, mandato_hasta, '[]') with &&
  ) where (es_directiva = true);

-- Y el desempate determinista en el trigger: siempre la CD más reciente.
create or replace function generar_movimiento_de_pago()
returns trigger language plpgsql security definer as $$
declare
  v_area_id     uuid;
  v_comision_id uuid;
  v_concepto    text;
begin
  if new.cuota_id is not null then
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

  if v_area_id is null then
    select id into v_comision_id from comision
    where es_directiva = true
      and mandato_desde <= current_date and mandato_hasta >= current_date
    order by mandato_desde desc          -- <<< desempate determinista
    limit 1;
  else
    select coalesce(
      (select ca.comision_id from comision_area ca
       join comision c on c.id = ca.comision_id
       where ca.area_id = v_area_id
         and c.mandato_desde <= current_date and c.mandato_hasta >= current_date
       order by c.mandato_desde desc     -- <<< desempate determinista
       limit 1),
      (select id from comision where es_directiva = true
         and mandato_desde <= current_date and mandato_hasta >= current_date
       order by mandato_desde desc
       limit 1)
    ) into v_comision_id;
  end if;

  insert into movimiento (tipo, monto, concepto, comision_id, area_id, usuario_id, pago_id)
  values ('ingreso', new.monto, v_concepto, v_comision_id, v_area_id,
          coalesce(new.registrado_por, auth.uid()), new.id);

  return new;
end;
$$;


-- ============================================================
-- FIX 4 — El socio puede cancelar su propio turno
-- ============================================================
-- Ventana configurable POR RECURSO (igual que el switch de aprobación):
-- el pádel puede tener 1 hora y el quincho 24. Son cosas distintas.
-- Lo modifica quien administra el área.

alter table recurso
  add column horas_cancelacion integer not null default 1
  check (horas_cancelacion >= 0);

comment on column recurso.horas_cancelacion is
  'Cuántas horas antes del turno el socio puede cancelar solo. Configurable por el admin del área.';

-- La policy deja UPDATE al titular; el trigger de abajo valida QUÉ puede cambiar.
create policy "cancelo mi turno" on turno for update
  using (usuario_id = auth.uid());

-- El socio SOLO puede cancelar, y solo dentro de la ventana.
-- No puede cambiar fecha, precio, estado de cobro ni nada más.
-- Esto se valida en la BASE, no en el frontend.
create or replace function validar_cancelacion_socio()
returns trigger language plpgsql security definer as $$
declare
  v_horas     integer;
  v_es_staff  boolean;
  v_esperado  turno;
begin
  select puede_gestionar_area(r.area_id) into v_es_staff
  from recurso r where r.id = new.recurso_id;

  -- El staff hace lo que quiere. Esta validación es solo para el socio.
  if v_es_staff or es_directiva() then
    return new;
  end if;

  if new.usuario_id = auth.uid() then
    -- Lo único permitido: pasar a 'cancelado'.
    if new.estado <> 'cancelado' then
      raise exception 'Solo podés cancelar tu turno.';
    end if;
    if old.estado not in ('pendiente_aprobacion', 'confirmado') then
      raise exception 'Este turno ya no se puede cancelar.';
    end if;

    -- Nada más puede cambiar. Comparamos la fila completa (incluye
    -- aprobado_por, cobrado_por, cobrado_at, era_socio, etc.) contra
    -- la fila vieja con el único campo permitido ya actualizado.
    -- IS DISTINCT FROM evita el error clásico de comparar con <>
    -- cuando alguna de esas columnas es NULL.
    v_esperado := old;
    v_esperado.estado := new.estado;
    if new is distinct from v_esperado then
      raise exception 'No podés modificar los datos del turno.';
    end if;

    select horas_cancelacion into v_horas from recurso where id = new.recurso_id;
    if now() > (old.inicio - make_interval(hours => v_horas)) then
      raise exception 'El plazo de cancelación venció (% horas antes del turno). Contactá al club.', v_horas;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_validar_cancelacion
  before update on turno
  for each row execute function validar_cancelacion_socio();


-- ============================================================
-- FIX 5 — Avisos: editables y borrables por quien los emitió
-- ============================================================
-- Antes quedaban congelados para siempre: ni un typo se podía arreglar.
-- Regla: el que lo publicó lo edita/borra. La CD borra cualquiera.

-- WITH CHECK repite la regla del INSERT: la CD edita cualquier cosa,
-- pero el autor de un aviso de área no puede usar el UPDATE para
-- convertirlo en global ni reasignarlo a un área que no gestiona.
create policy "edito mi aviso" on aviso for update
  using (usuario_id = auth.uid() or es_directiva())
  with check (
    es_directiva()
    or (usuario_id = auth.uid() and alcance = 'area' and puede_gestionar_area(area_id))
  );

create policy "borro mi aviso" on aviso for delete
  using (usuario_id = auth.uid() or es_directiva());
