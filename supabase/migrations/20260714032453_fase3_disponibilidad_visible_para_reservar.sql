-- ============================================================
-- CRC — horarios ocupados visibles para cualquiera, sin exponer de más
-- ============================================================
-- "veo mis turnos" (usuario_id=auth.uid() OR puede_gestionar_area) deja a
-- un socio común CIEGO sobre los turnos de otras personas — no puede ver
-- por qué las 20:00 están ocupadas, que es exactamente lo que pide la
-- grilla de reserva ("los ocupados se ven, no se ocultan").
--
-- La solución NO es abrir "veo mis turnos" a todos: eso expondría quién
-- reservó, a qué precio, con qué método de pago. Esta función devuelve
-- únicamente el rango horario ocupado y si ES el turno de quien pregunta
-- — lo mínimo que la grilla necesita para pintar "ocupado" vs "tuyo".

create or replace function horarios_ocupados(p_recurso_ids uuid[], p_desde timestamptz, p_hasta timestamptz)
returns table (recurso_id uuid, inicio timestamptz, fin timestamptz, es_mio boolean)
language sql stable security definer as $$
  select t.recurso_id, t.inicio, t.fin, (t.usuario_id = auth.uid()) as es_mio
  from turno t
  where t.recurso_id = any(p_recurso_ids)
    and t.estado in ('pendiente_aprobacion', 'confirmado')
    and t.inicio < p_hasta
    and t.fin > p_desde;
$$;
