import { club } from '@/config/club';

/**
 * Inyecta los colores del club como CSS variables que pisan las
 * definidas en globals.css. Es la única pieza que conecta
 * config/club.ts con el theme de Tailwind/shadcn — nada más en la
 * app debería referenciar un color del club directamente.
 */
export function ClubThemeStyle() {
  const { primario, primarioForeground, tinta, papel } = club.colores;

  return (
    <style>{`
      :root {
        --primary: ${primario};
        --primary-foreground: ${primarioForeground};
        --ring: ${primario};
        --sidebar-primary: ${primario};
        --sidebar-primary-foreground: ${primarioForeground};
        --sidebar-ring: ${primario};

        /* Tinta/papel pisan el gris neutro que deja shadcn por defecto. */
        --background: ${papel};
        --foreground: ${tinta};
        --card: #ffffff;
        --card-foreground: ${tinta};
        --border: color-mix(in oklch, ${tinta}, transparent 88%);
        --input: color-mix(in oklch, ${tinta}, transparent 82%);
        --muted: color-mix(in oklch, ${tinta}, transparent 95%);
        --muted-foreground: color-mix(in oklch, ${tinta}, transparent 40%);

        /* Alias crudos, sin mapear a background/foreground, para las
           piezas que necesitan invertir polaridad (el header del nav,
           el carnet) sin pelearse con los tokens semánticos. */
        --ink: ${tinta};
        --paper: ${papel};
      }
    `}</style>
  );
}
