import type { CubicacionItem } from "@/types/domain";
import { seedNow } from "@/data/mock/seed/timestamps";

// Porcentajes por defecto del sistema
const D = {
  levantamientoPct: 0.05,
  disenoPct: 0.2,
  qaAjustesPct: 0.15,
  puestaEnMarchaPct: 0.1,
  seniorPct: 0.7,
  ingeneroPct: 0.3,
  juniorPct: 0.6,
  directorHours: 0,
  disenadorHours: 0,
};

export const cubicacionItemsSeed: CubicacionItem[] = [
  {
    id: "cubi-1",
    contractId: "contract-1",
    requirementId: null,
    activityName: "Banner en página de inicio",
    construccionHours: 2,
    ...D,
    sortOrder: 1,
    createdAt: seedNow,
    updatedAt: seedNow,
  },
  {
    id: "cubi-2",
    contractId: "contract-1",
    requirementId: null,
    activityName: "2 banners dentro del banner Zafranal",
    construccionHours: 3,
    ...D,
    sortOrder: 2,
    createdAt: seedNow,
    updatedAt: seedNow,
  },
  {
    id: "cubi-3",
    contractId: "contract-1",
    requirementId: null,
    activityName: "Habilitar y ajustar ficha de proyecto",
    construccionHours: 12,
    ...D,
    sortOrder: 3,
    createdAt: seedNow,
    updatedAt: seedNow,
  },
];
