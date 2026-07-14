import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

/**
 * Envoltorio de las pantallas de auth: una franja verde arriba, como la
 * de un carnet, y un eyebrow mono que nombra el trámite ("ACCESO",
 * "ALTA DE CUENTA"). El stripe vive afuera de Card para no tener que
 * pelearle el padding al componente compartido.
 */
export function AuthCard({ eyebrow, title, description, children }: Props) {
  return (
    <div className="overflow-hidden rounded-xl shadow-sm ring-1 ring-ink/10">
      <div className="h-1.5 bg-primary" />
      <Card className="gap-4 rounded-none border-0 py-6 shadow-none ring-0">
        <CardHeader>
          <p className="font-mono text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
            {eyebrow}
          </p>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
