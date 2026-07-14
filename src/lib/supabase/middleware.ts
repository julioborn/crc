import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './types';

const RUTAS_PROTEGIDAS = ['/app'];

/**
 * Refresca la sesión de Supabase en cada request y protege /app/*.
 * Se llama desde middleware.ts (raíz de src/).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // No usar getSession() acá: getUser() valida el JWT contra el servidor
  // de Supabase en vez de confiar en la cookie sin verificar.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const esRutaProtegida = RUTAS_PROTEGIDAS.some((ruta) =>
    request.nextUrl.pathname.startsWith(ruta),
  );

  if (esRutaProtegida && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // IMPORTANTE: hay que devolver supabaseResponse tal cual. Si se crea un
  // NextResponse nuevo acá, hay que copiarle las cookies o se rompe la sesión.
  return supabaseResponse;
}
