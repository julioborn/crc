import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

/**
 * Cliente Supabase para Server Components, Server Actions y Route Handlers.
 * Se crea uno nuevo por request (no se puede cachear entre requests).
 *
 * El `setAll` puede fallar si se llama desde un Server Component puro
 * (no puede escribir cookies) — se ignora porque el middleware ya se
 * encarga de refrescar y persistir la sesión en esos casos.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component: el middleware refresca la sesión.
          }
        },
      },
    },
  );
}
