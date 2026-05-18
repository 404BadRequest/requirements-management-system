"use client";

import { useLayoutEffect } from "react";
import { useUiStore } from "@/store/ui-store";

/** Alinea `<html data-density>` con Zustand para estilos CSS que afectan RSC hijos (KPIs, tablas, etc.). */
export function DensityHtmlSync() {
  const density = useUiStore((s) => s.density);

  useLayoutEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  return null;
}
