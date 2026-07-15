import type { MetadataRoute } from 'next';
import { club } from '@/config/club';

// Next.js sirve esto en /manifest.webmanifest y ya inyecta el <link
// rel="manifest"> solo — sin esto, "Agregar a inicio" en iOS puede no
// abrir en modo standalone, y ahí window.navigator.standalone nunca
// queda en true (el chequeo que usa el pedido de permiso de push).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: club.nombreCompleto,
    short_name: club.nombreCorto,
    description: club.nombreCompleto,
    start_url: '/app',
    display: 'standalone',
    background_color: club.colores.papel,
    theme_color: club.colores.primario,
    icons: [{ src: club.logo, sizes: '512x512', type: 'image/png', purpose: 'any' }],
  };
}
