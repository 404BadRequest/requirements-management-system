import { create } from "zustand";

type Density = "compact" | "comfortable";
type Theme = "light" | "dark" | "system";

interface UiState {
  density: Density;
  theme: Theme;
  requirementFilter: string;
  setDensity: (density: Density) => void;
  setTheme: (theme: Theme) => void;
  setRequirementFilter: (value: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  density: "compact",
  theme: "system",
  requirementFilter: "",
  setDensity: (density) => set({ density: density === "compact" ? "compact" : "compact" }),
  setTheme: (theme) => set({ theme }),
  setRequirementFilter: (requirementFilter) => set({ requirementFilter }),
}));
