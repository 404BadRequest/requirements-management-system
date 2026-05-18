"use client";

import type { ReactNode } from "react";

/**
 * Tema fijo del sistema: no requerimos inyección de script de `next-themes`.
 * Mantener este wrapper evita tocar el resto del layout.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
