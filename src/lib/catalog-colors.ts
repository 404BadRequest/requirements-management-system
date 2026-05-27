export type CatalogColor =
  | "green"
  | "blue"
  | "amber"
  | "red"
  | "gray"
  | "purple"
  | "orange"
  | "teal"
  | "pink";

export const CATALOG_COLOR_KEYS: CatalogColor[] = [
  "green",
  "blue",
  "amber",
  "red",
  "gray",
  "purple",
  "orange",
  "teal",
  "pink",
];

export const CATALOG_COLORS: Record<
  CatalogColor,
  { label: string; classes: { dot: string; bg: string; text: string }; hex: string }
> = {
  green: {
    label: "Verde",
    hex: "#10b981",
    classes: {
      dot: "bg-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-800 dark:text-emerald-300",
    },
  },
  blue: {
    label: "Azul",
    hex: "#3b82f6",
    classes: {
      dot: "bg-blue-500",
      bg: "bg-blue-50 dark:bg-blue-950/40",
      text: "text-blue-800 dark:text-blue-300",
    },
  },
  amber: {
    label: "Ámbar",
    hex: "#f59e0b",
    classes: {
      dot: "bg-amber-500",
      bg: "bg-amber-50 dark:bg-amber-950/40",
      text: "text-amber-800 dark:text-amber-300",
    },
  },
  red: {
    label: "Rojo",
    hex: "#ef4444",
    classes: {
      dot: "bg-red-500",
      bg: "bg-red-50 dark:bg-red-950/40",
      text: "text-red-800 dark:text-red-300",
    },
  },
  gray: {
    label: "Gris",
    hex: "#94a3b8",
    classes: {
      dot: "bg-slate-400",
      bg: "bg-slate-100 dark:bg-slate-800/40",
      text: "text-slate-600 dark:text-slate-400",
    },
  },
  purple: {
    label: "Púrpura",
    hex: "#a855f7",
    classes: {
      dot: "bg-purple-500",
      bg: "bg-purple-50 dark:bg-purple-950/40",
      text: "text-purple-800 dark:text-purple-300",
    },
  },
  orange: {
    label: "Naranja",
    hex: "#f97316",
    classes: {
      dot: "bg-orange-500",
      bg: "bg-orange-50 dark:bg-orange-950/40",
      text: "text-orange-800 dark:text-orange-300",
    },
  },
  teal: {
    label: "Teal",
    hex: "#14b8a6",
    classes: {
      dot: "bg-teal-500",
      bg: "bg-teal-50 dark:bg-teal-950/40",
      text: "text-teal-800 dark:text-teal-300",
    },
  },
  pink: {
    label: "Rosa",
    hex: "#ec4899",
    classes: {
      dot: "bg-pink-500",
      bg: "bg-pink-50 dark:bg-pink-950/40",
      text: "text-pink-800 dark:text-pink-300",
    },
  },
};

/** Devuelve las clases Tailwind para un token de color, o null si el token no es válido. */
export function catalogColorClasses(
  color: string | null | undefined,
): { dot: string; bg: string; text: string } | null {
  if (!color) return null;
  return CATALOG_COLORS[color as CatalogColor]?.classes ?? null;
}

/** Devuelve el hex para un token de color (usado en bordes inline-style del Kanban). */
export function catalogColorHex(color: string | null | undefined): string | null {
  if (!color) return null;
  return CATALOG_COLORS[color as CatalogColor]?.hex ?? null;
}
