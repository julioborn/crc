/**
 * Configuración del club. Este es el ÚNICO archivo que cambia al clonar
 * el sistema para otro club: nombre, logo, colores y feature flags.
 * Ningún componente debe tener "CRC" (ni ningún otro dato del club)
 * escrito a mano — todo sale de acá.
 */

export const club = {
  nombreCorto: 'CRC',
  nombreCompleto: 'Centro Recreativo Calchaquí',
  logo: '/icon-512x512.png',

  // El servidor corre en UTC (Vercel). Toda la lógica de horarios —
  // disponibilidad, reservas, agenda, bloqueos, ventana de cancelación—
  // tiene que convertir a/desde esta zona explícitamente. Nunca asumir
  // la hora del servidor ni la del navegador del usuario.
  timezone: 'America/Argentina/Buenos_Aires',

  // Se inyectan como CSS variables (ver src/components/club-theme.tsx)
  // y de ahí las toma el theme de Tailwind/shadcn. Cambiar el hex acá
  // cambia el color en toda la app, sin tocar un solo componente.
  colores: {
    primario: '#22c55e',
    primarioForeground: '#052e16',
    // "Tinta" y "papel" en vez de negro/blanco puros: la tinta lleva un
    // dejo verde (liga el neutro a la marca) y el papel es un blanco
    // hueso, no clínico — piensa en cartulina de carnet, no en pantalla.
    tinta: '#0e1512',
    papel: '#fafaf8',
  },

  features: {
    turnos: true,
    cuotas: true,
    mercadopago: true,
    avisos: true,
  },
} as const;

export type ClubConfig = typeof club;
export type FeatureFlag = keyof typeof club.features;

export function featureHabilitada(flag: FeatureFlag): boolean {
  return club.features[flag];
}
