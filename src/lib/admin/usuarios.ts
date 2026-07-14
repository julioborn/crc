'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Busca usuarios existentes por nombre/apellido/dni/email. Se apoya en la
 * RLS de "usuario" ("veo mi perfil": id = auth.uid() OR es_directiva()) —
 * solo devuelve resultados útiles cuando lo llama un CD, que es el único
 * que llega a las pantallas que usan esto.
 */
export async function buscarUsuarios(query: string) {
  const q = query.trim().replace(/[,()%]/g, '');
  if (!q) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('usuario')
    .select('id, nombre, apellido, dni, email')
    .or(`nombre.ilike.%${q}%,apellido.ilike.%${q}%,dni.ilike.%${q}%,email.ilike.%${q}%`)
    .order('apellido')
    .limit(10);

  return data ?? [];
}

/**
 * Busca SOCIOS (no usuarios) por nombre, apellido o número de socio, para
 * inscribirlos a una actividad. Se apoya en "veo socios" (cualquiera con
 * un cargo vigente, no solo la CD) — quien llega a esta pantalla ya pasó
 * el guard de /app/inscripciones, así que si tiene algún resultado es
 * porque tiene motivo para verlo.
 */
export async function buscarSocios(query: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('socio')
    .select('id, numero_socio, usuario:usuario_id(nombre, apellido)')
    .order('numero_socio')
    .limit(300);

  const socios = data ?? [];
  const q = query.trim().toLowerCase();
  if (!q) return socios.slice(0, 10);

  return socios
    .filter((s) => {
      const nombre = `${s.usuario?.nombre ?? ''} ${s.usuario?.apellido ?? ''}`.toLowerCase();
      return nombre.includes(q) || String(s.numero_socio).includes(q);
    })
    .slice(0, 10);
}
