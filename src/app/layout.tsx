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
  title: "Requirements Management System",
  description: "Gestión interna de requerimientos, horas y presupuesto",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-density="compact" className={fontApp.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <DensityHtmlSync />
          {children}
          <SonnerToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
