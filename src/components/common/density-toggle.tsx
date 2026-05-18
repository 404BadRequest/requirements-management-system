"use client";

import { useUiStore } from "@/store/ui-store";

export const DensityToggle = () => {
  const { density, setDensity } = useUiStore();

  return (
    <select
      value={density}
      className="field-control py-1.5 pr-8 text-xs sm:text-sm"
      aria-label="Densidad de la interfaz"
      onChange={(event) => setDensity(event.target.value as "compact" | "comfortable")}
    >
      <option value="comfortable">Cómoda</option>
      <option value="compact">Compacta</option>
    </select>
  );
};
