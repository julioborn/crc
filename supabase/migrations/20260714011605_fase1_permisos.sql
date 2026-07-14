-- ============================================================
-- CRC — Migración 003: ajustes de permisos para Fase 1
-- ============================================================
-- Fase 1 construye el andamiaje de permisos (áreas, comisiones, cargos,
-- socios). Antes de construir la UI encontramos dos huecos que rompen
-- exactamente lo que esta fase necesita: que una subcomisión pueda ver y
-- gestionar SUS áreas sin pasar por la CD.

-- ============================================================
-- FIX 1 — comision_area no tenía policy de SELECT
-- ============================================================
-- Sin esto, nadie fuera de la CD puede leer qué áreas gestiona su propia
-- comisión: ni el nav puede mostrar "tus áreas", ni la subcomisión puede
-- ver la lista para inscribir actividades. Es metadata estructural (qué
-- comisión gestiona qué área), no dato sensible — igual que area/comision,
-- que ya son de lectura pública.

create policy "comision_area visible" on comision_area for select using (true);


-- ============================================================
-- FIX 2 — socio_area solo lo podía escribir la CD
-- ============================================================
-- Mismo error que "registrar pago presencial" en la migración anterior:
-- "el cargo dice QUÉ, el área dice DÓNDE". El tesorero de básquet tiene
-- que poder inscribir/dar de baja actividades de básquet sin pasar por
-- la CD.

drop policy if exists "admin actividades" on socio_area;

create policy "gestiono actividades de mi area" on socio_area for all
  using (es_directiva() or puede_gestionar_area(area_id))
  with check (es_directiva() or puede_gestionar_area(area_id));


-- ============================================================
-- FIX 3 — usuario.email espejado desde auth.users
-- ============================================================
-- El alta de socio exige que la administración CONFIRME el mail antes de
-- asociar (es el canal del link de pago y del recibo). auth.users no se
-- puede leer desde el cliente vía RLS/PostgREST, y la alternativa —usar
-- la Auth Admin API con la service_role key— es más superficie de ataque
-- de la que hace falta para mostrar un email. Se espeja el email a
-- public.usuario (mismo patrón que nombre/apellido/telefono) y la RLS
-- que ya existe en usuario decide quién lo ve.

alter table usuario add column email text;

update usuario u set email = a.email
from auth.users a
where a.id = u.id and u.email is null;

create or replace function handle_nuevo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.usuario (id, nombre, apellido, telefono, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    new.raw_user_meta_data->>'telefono',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function sync_email_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.usuario set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger trg_sync_email_usuario
  after update of email on auth.users
  for each row execute function sync_email_usuario();
