'use client';

import { useActionState } from 'react';
import { actualizarPassword, type AuthState } from '@/lib/auth/actions';
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

export default function ActualizarPasswordPage() {
  const [state, formAction] = useActionState(actualizarPassword, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Elegí una contraseña nueva</CardTitle>
        <CardDescription>Esta va a reemplazar la anterior.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña nueva</Label>
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
          <SubmitButton pendingText="Guardando...">Guardar</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
