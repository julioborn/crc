import { createClient } from '@/lib/supabase/server';
import { actualizarCargo } from '@/lib/admin/cargos';
import { NuevoCargoForm } from './nuevo-cargo-form';
import { CARGO_LABEL } from '@/lib/auth/roles';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default async function CargosPage() {
  const supabase = await createClient();

  const [{ data: comisiones }, { data: cargos }] = await Promise.all([
    supabase.from('comision').select('id, nombre, es_directiva').order('nombre'),
    supabase
      .from('cargo_comision')
      .select('id, cargo, vigente_desde, vigente_hasta, usuario:usuario_id(nombre, apellido), comision:comision_id(nombre)')
      .order('vigente_desde', { ascending: false }),
  ]);

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Cargos</h1>
        <p className="text-sm text-muted-foreground">
          Quién ocupa qué cargo en qué comisión, y desde/hasta cuándo. Cerrar un
          mandato es poner la fecha hasta — nunca se borra, es el historial.
        </p>
      </div>

      <NuevoCargoForm comisiones={comisiones ?? []} />

      <div className="space-y-3">
        {(cargos ?? []).map((c) => {
          const vigente =
            c.vigente_desde <= hoy && (c.vigente_hasta === null || c.vigente_hasta >= hoy);

          return (
            <form
              key={c.id}
              action={actualizarCargo.bind(null, c.id)}
              className="space-y-3 rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">
                  {c.usuario?.nombre} {c.usuario?.apellido}
                </p>
                <span className="text-sm text-muted-foreground">
                  · {c.comision?.nombre}
                </span>
                <Badge variant={vigente ? 'default' : 'secondary'}>
                  {vigente ? 'Vigente' : 'Histórico'}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Cargo</label>
                  <Select name="cargo" defaultValue={c.cargo}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CARGO_LABEL).map(([valor, etiqueta]) => (
                        <SelectItem key={valor} value={valor}>
                          {etiqueta}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Desde</label>
                  <Input name="vigente_desde" type="date" defaultValue={c.vigente_desde} required />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Hasta</label>
                  <Input name="vigente_hasta" type="date" defaultValue={c.vigente_hasta ?? ''} />
                </div>
              </div>

              <Button type="submit" size="sm" variant="outline" className="w-auto">
                Guardar
              </Button>
            </form>
          );
        })}
        {cargos?.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay cargos asignados.</p>
        )}
      </div>
    </div>
  );
}
