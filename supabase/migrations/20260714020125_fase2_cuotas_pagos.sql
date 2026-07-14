-- ============================================================
-- CRC — Migración Fase 2: cuotas y pagos
-- ============================================================
-- La más delicada del proyecto: acá se mueve plata real. Cada función es
-- SECURITY DEFINER solo donde hace falta cruzar una RLS que el caller
-- legítimamente no debería poder saltar por su cuenta (ver comentarios).


-- ============================================================
-- 1) iniciar_pago_cuota — el socio pasa SU cuota a "pendiente"
-- ============================================================
-- No hay policy de UPDATE en cuota para socios (a propósito: "admin
-- cuotas" es CD-only). Un socio iniciando un pago necesita mover SU
-- cuota de impaga a pendiente, nada más — ni tocar el monto, ni el
-- período, ni marcarla pagada él mismo. Una función angosta y explícita
-- es más segura acá que abrir una policy de UPDATE genérica que después
-- haya que blindar columna por columna.

create or replace function iniciar_pago_cuota(p_cuota_id uuid)
returns void language plpgsql security definer as $$
begin
  if not es_mi_cuota(p_cuota_id) then
    raise exception 'Esa cuota no es tuya.';
  end if;

  update cuota set estado = 'pendiente'
  where id = p_cuota_id and estado = 'impaga';

  if not found then
    raise exception 'La cuota no está impaga (ya está pendiente, pagada o anulada).';
  end if;
end;
$$;


-- ============================================================
-- 2) comision_responsable — para egresos manuales
-- ============================================================
-- Misma resolución que ya usa generar_movimiento_de_pago (no se toca esa
-- función), pero expuesta aparte para el flujo de egresos manuales, que
-- no pasa por ningún trigger de pago.

create or replace function comision_responsable(p_area_id uuid)
returns uuid language plpgsql stable as $$
declare
  v_comision_id uuid;
begin
  if p_area_id is null then
    select id into v_comision_id from comision
    where es_directiva = true
      and mandato_desde <= current_date and mandato_hasta >= current_date
    order by mandato_desde desc limit 1;
  else
    select coalesce(
      (select ca.comision_id from comision_area ca
       join comision c on c.id = ca.comision_id
       where ca.area_id = p_area_id
         and c.mandato_desde <= current_date and c.mandato_hasta >= current_date
       order by c.mandato_desde desc limit 1),
      (select id from comision where es_directiva = true
         and mandato_desde <= current_date and mandato_hasta >= current_date
       order by mandato_desde desc limit 1)
    ) into v_comision_id;
  end if;

  return v_comision_id;
end;
$$;


-- ============================================================
-- 3) arancel: nunca se edita — cerrar + crear, atómico
-- ============================================================
-- SECURITY INVOKER a propósito: PostgREST ejecuta cada llamada RPC en una
-- transacción, así que el UPDATE+INSERT ya son atómicos sin necesidad de
-- saltar la RLS. Si quien llama no es CD, "aranceles admin" rechaza los
-- dos statements igual que rechazaría un UPDATE o INSERT sueltos.

create or replace function cerrar_y_crear_arancel(
  p_tipo text,
  p_area_id uuid,
  p_monto numeric,
  p_vigente_desde date
) returns uuid language plpgsql as $$
declare
  v_id uuid;
  v_anterior_desde date;
begin
  select vigente_desde into v_anterior_desde
  from arancel
  where tipo = p_tipo
    and area_id is not distinct from p_area_id
    and vigente_hasta is null;

  if v_anterior_desde is not null and p_vigente_desde <= v_anterior_desde then
    raise exception 'La nueva vigencia (%) tiene que ser posterior a la del arancel actual (%).',
      p_vigente_desde, v_anterior_desde;
  end if;

  update arancel
  set vigente_hasta = p_vigente_desde - 1
  where tipo = p_tipo
    and area_id is not distinct from p_area_id
    and vigente_hasta is null;

  insert into arancel (tipo, area_id, monto, vigente_desde)
  values (p_tipo, p_area_id, p_monto, p_vigente_desde)
  returning id into v_id;

  return v_id;
end;
$$;

-- Cinturón y tiradores: aunque la función ya lo valida, esto lo hace
-- imposible de romper incluso si alguien escribe en arancel por otro
-- camino. Mismo patrón que directiva_sin_solapamiento (Fase 0).
alter table arancel add constraint arancel_sin_solapamiento
  exclude using gist (
    tipo with =,
    coalesce(area_id, '00000000-0000-0000-0000-000000000000'::uuid) with =,
    daterange(vigente_desde, coalesce(vigente_hasta, 'infinity'::date), '[]') with &&
  );
