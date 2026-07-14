import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AppHomePage() {
  const supabase = await createClient();
  const { data: esDirectiva } = await supabase.rpc('es_directiva');

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>
          {esDirectiva ? 'Panel de la Comisión Directiva' : 'Tu cuenta'}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Fase 0: cimientos listos. Socios, cuotas, turnos y avisos llegan en las
        próximas fases.
      </CardContent>
    </Card>
  );
}
