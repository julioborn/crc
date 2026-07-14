import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Vocabulario visual compartido por las ~12 pantallas de gestión/admin:
 * mismo tratamiento de header, tarjeta de "crear nuevo", separador de
 * sección y tarjeta de ítem que ya usa el home (eyebrow mono + card con
 * borde). Antes cada página repetía <h1>/<p> sueltos y `rounded-lg
 * border p-4` a mano — esto evita que cada pantalla quede "a su manera".
 */

export function PageHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1.5">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">{eyebrow}</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {aside}
    </div>
  );
}

export function NuevoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4 rounded-xl border border-primary/25 bg-primary/[0.03] p-5">
      <p className="flex items-center gap-1.5 font-mono text-xs tracking-widest text-primary uppercase">
        <Plus className="size-3.5" /> {title}
      </p>
      {children}
    </div>
  );
}

export function SectionLabel({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <p className="shrink-0 font-mono text-xs tracking-widest text-muted-foreground uppercase">{children}</p>
      {count !== undefined && (
        <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground">
          {count}
        </span>
      )}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function ItemCard({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={cn('space-y-3 rounded-xl border p-5 transition-colors hover:border-primary/20', className)}>
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">{children}</p>
  );
}

export function StatRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <span className={cn('flex flex-col', className)}>
      <span className="font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">{label}</span>
      <span className="font-mono text-lg font-semibold">{value}</span>
    </span>
  );
}
