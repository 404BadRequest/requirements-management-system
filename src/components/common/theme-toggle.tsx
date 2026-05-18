"use client";

import { useTheme } from "next-themes";

export const ThemeToggle = () => {
  const { setTheme } = useTheme();
  return (
    <select className="field-control py-1.5 pr-8 text-xs sm:text-sm" onChange={(e) => setTheme(e.target.value)} aria-label="Tema de la interfaz">
      <option value="light">Claro</option>
      <option value="dark">Oscuro</option>
      <option value="system">Sistema</option>
    </select>
  );
};
