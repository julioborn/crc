'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export type AuthState = { error: string | null; success?: boolean };

async function origin() {
  // No hay NEXT_PUBLIC_SITE_URL configurada todavía (no hace falta en local);
  // se arma el origin desde los headers del request.
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host');
  return `${proto}://${host}`;
}

export async function login(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: 'Email o contraseña incorrectos.' };
  }

  redirect('/app');
}

export async function registro(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const nombre = String(formData.get('nombre') ?? '').trim();
  const apellido = String(formData.get('apellido') ?? '').trim();
  const telefono = String(formData.get('telefono') ?? '').trim() || null;

  if (!nombre || !apellido) {
    return { error: 'Nombre y apellido son obligatorios.' };
  }

  const supabase = await createClient();
  // handle_nuevo_usuario (trigger en auth.users) lee nombre/apellido/telefono
  // de acá para crear la fila en public.usuario. Ver supabase/migrations/
  // 20260713230835_correcciones.sql.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre, apellido, telefono } },
  });

  if (error) {
    return { error: error.message };
  }

  // "Confirm email" está desactivado en el proyecto: signUp ya deja
  // sesión activa, se entra directo.
  redirect('/app');
}

export async function recuperar(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '');

  const supabase = await createClient();
  const site = await origin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${site}/auth/callback?next=/actualizar-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null, success: true };
}

export async function actualizarPassword(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get('password') ?? '');

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect('/app');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
