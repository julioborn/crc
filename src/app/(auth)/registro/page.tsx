'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registro, type AuthState } from '@/lib/auth/actions';
import { SubmitButton } from '@/components/submit-button';
import { AuthCard } from '@/components/auth-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: AuthState = { error: null };

export default function RegistroPage() {
  const [state, formAction] = useActionState(registro, initialState);

  return (
    <AuthCard
      eyebrow="Alta de cuenta"
      title="Crear cuenta"
      description="Cualquiera puede registrarse. Ser socio es un paso aparte que habilita la administración."
    >
      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" required autoComplete="given-name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apellido">Apellido</Label>
            <Input id="apellido" name="apellido" required autoComplete="family-name" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono (opcional)</Label>
          <Input id="telefono" name="telefono" type="tel" autoComplete="tel" />
        </div>
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
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <SubmitButton pendingText="Creando cuenta...">Crear cuenta</SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Iniciá sesión
        </Link>
      </p>
    </AuthCard>
  );
}
