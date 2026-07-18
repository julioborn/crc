import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Public_Sans, JetBrains_Mono } from "next/font/google";
import { club } from "@/config/club";
import { ClubThemeStyle } from "@/components/club-theme";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  weight: ["600", "700", "800"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: club.nombreCompleto,
  description: club.nombreCompleto,
  icons: {
    icon: club.logo,
    apple: club.logo,
  },
  // iOS ignora bastante del manifest para decidir "modo app" — estos
  // meta tags son lo que realmente hace que, al abrir desde el ícono
  // agregado a inicio, window.navigator.standalone quede en true.
  // "black-translucent" dice: no pintes vos la barra de estado, dejá
  // que el contenido de la página se vea por debajo (así el header
  // bg-ink llega hasta la isla dinámica en vez de una franja blanca
  // encima) — el header compensa con padding-top: safe-area-inset-top.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: club.nombreCorto,
  },
};

export const viewport: Viewport = {
  themeColor: club.colores.tinta,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={cn(
        "h-full antialiased",
        publicSans.variable,
        barlowCondensed.variable,
        jetbrainsMono.variable,
      )}
    >
      <head>
        <ClubThemeStyle />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
