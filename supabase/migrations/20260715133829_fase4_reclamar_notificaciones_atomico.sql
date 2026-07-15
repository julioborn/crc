-- push-send hacía SELECT pendientes -> mandaba FCM -> UPDATE al final.
-- Si dos invocaciones corren en paralelo (el cron cada 5 min + un
-- disparo manual, por ejemplo), ambas pueden leer la misma fila antes
-- de que cualquiera la marque como procesada: doble push para la misma
-- notificación. FOR UPDATE SKIP LOCKED hace el claim atómico — la
-- segunda invocación concurrente directamente salta las filas que la
-- primera ya está tocando, en vez de leerlas también.
create or replace function reclamar_notificaciones_pendientes(p_limite int default 200)
returns table (
  id uuid,
  usuario_id uuid,
  categoria notificacion_categoria,
  titulo text,
  cuerpo text,
  deep_link text
)
language plpgsql security definer set search_path = public as $$
begin
  return query
  update notificacion n
  set push_enviado = true
  from (
    select nn.id
    from notificacion nn
    where nn.push_enviado = false
    order by nn.created_at
    limit p_limite
    for update skip locked
  ) claim
  where n.id = claim.id
  returning n.id, n.usuario_id, n.categoria, n.titulo, n.cuerpo, n.deep_link;
end;
$$;
