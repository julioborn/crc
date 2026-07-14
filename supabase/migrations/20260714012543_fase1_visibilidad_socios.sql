-- ============================================================
-- CRC — Migración 004: cualquier cargo vigente puede ver el padrón
-- ============================================================
-- Para inscribir socios a una actividad de su área, una subcomisión
-- necesita poder buscar/ver socios que todavía no están anotados en esa
-- área — no solo los que ya están. "veo mi socio" solo dejaba ver la
-- fila propia o todo si era CD; ningún término intermedio.
--
-- Ver el padrón (número, nombre, grupo) para hacer su trabajo es
-- razonable para cualquiera con un cargo vigente en cualquier comisión
-- -- no hace falta que sea CD ni que gestione un área en particular.
-- Las acciones (inscribir/dar de baja actividades, cobrar) siguen atadas
-- a puede_gestionar_area() como siempre.

create or replace function tiene_cargo_vigente()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from cargo_comision cc
    join comision c on c.id = cc.comision_id
    where cc.usuario_id = auth.uid()
      and cc.vigente_desde <= current_date
      and (cc.vigente_hasta is null or cc.vigente_hasta >= current_date)
      and c.mandato_desde <= current_date
      and c.mandato_hasta >= current_date
  );
$$;

drop policy if exists "veo mi socio" on socio;

create policy "veo socios" on socio for select
  using (usuario_id = auth.uid() or es_directiva() or tiene_cargo_vigente());
