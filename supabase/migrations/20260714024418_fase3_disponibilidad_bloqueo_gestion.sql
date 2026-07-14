-- ============================================================
-- CRC — Migración Fase 3: gestión de disponibilidad y bloqueos
-- ============================================================
-- disponibilidad y bloqueo solo tenían policy de SELECT. Sin una de
-- escritura, nadie —ni la CD— podía cargar horarios ni bloqueos desde el
-- cliente (el service_role no se usa para esto). Mismo patrón que
-- "recursos gestion": quien administra el área del recurso administra
-- también su disponibilidad y sus bloqueos.

create policy "disponibilidad gestion" on disponibilidad for all
  using (exists (
    select 1 from recurso r where r.id = disponibilidad.recurso_id and puede_gestionar_area(r.area_id)
  ))
  with check (exists (
    select 1 from recurso r where r.id = disponibilidad.recurso_id and puede_gestionar_area(r.area_id)
  ));

create policy "bloqueo gestion" on bloqueo for all
  using (exists (
    select 1 from recurso r where r.id = bloqueo.recurso_id and puede_gestionar_area(r.area_id)
  ))
  with check (exists (
    select 1 from recurso r where r.id = bloqueo.recurso_id and puede_gestionar_area(r.area_id)
  ));
