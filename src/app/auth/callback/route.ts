import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Único punto de entrada para los links que manda Supabase Auth por email
 * (confirmación de registro y recuperación de contraseña). Intercambia el
 * `code` por una sesión y redirige a `next`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/app';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('No pudimos verificar el enlace. Pedí uno nuevo.')}`,
  );
}
