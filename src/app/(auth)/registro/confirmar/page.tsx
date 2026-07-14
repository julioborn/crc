import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ConfirmarRegistroPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirmá tu email</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Te mandamos un link de confirmación. Abrilo para activar tu cuenta y poder
          iniciar sesión.
        </p>
      </CardContent>
    </Card>
  );
}
