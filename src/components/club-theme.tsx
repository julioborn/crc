import { club } from '@/config/club';

/**
 * Inyecta los colores del club como CSS variables que pisan las
 * definidas en globals.css. Es la única pieza que conecta
 * config/club.ts con el theme de Tailwind/shadcn — nada más en la
 * app debería referenciar un color del club directamente.
 */
export function ClubThemeStyle() {
  const { primario, primarioForeground } = club.colores;

  return (
    <style>{`
      :root {
        --primary: ${primario};
        --primary-foreground: ${primarioForeground};
        --ring: ${primario};
        --sidebar-primary: ${primario};
        --sidebar-primary-foreground: ${primarioForeground};
        --sidebar-ring: ${primario};
      }
    `}</style>
  );
}
