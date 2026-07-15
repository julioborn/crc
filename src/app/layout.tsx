import type { Metadata } from "next";
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: club.nombreCorto,
  },
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
