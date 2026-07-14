import type { Database } from '@/lib/supabase/types';

type CargoRow = {
  cargo: Database['public']['Enums']['cargo_tipo'];
  vigente_desde: string;
  vigente_hasta: string | null;
  comision: {
    nombre: string;
    es_directiva: boolean;
    mandato_desde: string;
    mandato_hasta: string;
  } | null;
};

const CARGO_LABEL: Record<Database['public']['Enums']['cargo_tipo'], string> = {
  presidente: 'Presidente',
  vicepresidente: 'Vicepresidente',
  secretario: 'Secretario',
  prosecretario: 'Prosecretario',
  tesorero: 'Tesorero',
  protesorero: 'Protesorero',
  vocal: 'Vocal',
  revisor_cuentas: 'Revisor de cuentas',
};

/**
 * Misma regla de vigencia que usan es_directiva()/puede_gestionar_area() en
 * la base: la vigencia PROPIA del cargo Y el mandato de la comisión, las dos.
 * Si cualquiera venció, el cargo no cuenta — se replica acá solo para pintar
 * la nav; el permiso real siempre lo decide la RLS en el servidor.
 */
export function cargosVigentes(cargos: CargoRow[], hoy = new Date()) {
  const fecha = hoy.toISOString().slice(0, 10);

  return cargos
    .filter((c) => c.comision !== null)
    .filter((c) => {
      const cargoVigente =
        c.vigente_desde <= fecha && (c.vigente_hasta === null || c.vigente_hasta >= fecha);
      const mandatoVigente =
        c.comision!.mandato_desde <= fecha && c.comision!.mandato_hasta >= fecha;
      return cargoVigente && mandatoVigente;
    })
    .map((c) => ({
      etiqueta: `${CARGO_LABEL[c.cargo]} · ${c.comision!.nombre}`,
      esDirectiva: c.comision!.es_directiva,
    }));
}
