'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { recuperar, type AuthState } from '@/lib/auth/actions';
import { SubmitButton } from '@/components/submit-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: AuthState = { error: null };

export default function RecuperarPage() {
  const [state, formAction] = useActionState(recuperar, initialState);

  if (state.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revisá tu email</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Si el email existe, te mandamos un link para elegir una contraseña nueva.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar contraseña</CardTitle>
        <CardDescription>Te mandamos un link para elegir una nueva.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <SubmitButton pendingText="Enviando...">Enviar link</SubmitButton>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
