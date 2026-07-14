'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { login, type AuthState } from '@/lib/auth/actions';
import { SubmitButton } from '@/components/submit-button';
import { AuthCard } from '@/components/auth-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: AuthState = { error: null };

export default function LoginPage() {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <AuthCard
      eyebrow="Acceso socios"
      title="Iniciar sesión"
      description="Entrá con tu email y contraseña."
    >
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <SubmitButton pendingText="Entrando...">Entrar</SubmitButton>
      </form>
      <div className="mt-4 flex flex-col gap-1 text-center text-sm text-muted-foreground">
        <Link href="/recuperar" className="hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
        <span>
          ¿No tenés cuenta?{' '}
          <Link href="/registro" className="font-medium text-primary hover:underline">
            Registrate
          </Link>
        </span>
      </div>
    </AuthCard>
  );
}
