import type { Metadata } from "next";
import { Oxanium } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DensityHtmlSync } from "@/components/providers/density-html-sync";
import { SonnerToaster } from "@/components/providers/sonner-toaster";

const fontApp = Oxanium({
  subsets: ["latin"],
  variable: "--font-app",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Requirement System TI",
    template: "%s · RST",
  },
  description: "Gestión interna de requerimientos, horas y presupuesto",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-density="compact" className={fontApp.variable} suppressHydrationWarning>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[200] focus:rounded-[2px] focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-soft focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Ir al contenido principal
        </a>
        <ThemeProvider>
          <DensityHtmlSync />
          {children}
          <SonnerToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
