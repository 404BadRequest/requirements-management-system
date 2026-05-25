import type { CubicacionItemCreateInput, CubicacionItemUpdateInput } from "@/data/contracts/cubicacion-contract";
import { cubicacionItemsSeed } from "@/data/mock/cubicacion-seed";
import type { CubicacionItem } from "@/types/domain";

let rows: CubicacionItem[] = cubicacionItemsSeed.map((r) => ({ ...r }));
let seq = rows.length + 1;

export class MockCubicacionRepository {
  async listByContract(contractId: string): Promise<CubicacionItem[]> {
    return rows.filter((r) => r.contractId === contractId).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async create(input: CubicacionItemCreateInput): Promise<CubicacionItem> {
    const now = new Date().toISOString();
    const item: CubicacionItem = {
      id: `cubi-${seq++}`,
      contractId: input.contractId,
      requirementId: input.requirementId,
      activityName: input.activityName,
      construccionHours: input.construccionHours,
      levantamientoPct: input.levantamientoPct,
      disenoPct: input.disenoPct,
      qaAjustesPct: input.qaAjustesPct,
      puestaEnMarchaPct: input.puestaEnMarchaPct,
      seniorPct: input.seniorPct,
      ingeneroPct: input.ingeneroPct,
      juniorPct: input.juniorPct,
      sortOrder: input.sortOrder,
      createdAt: now,
      updatedAt: now,
    };
    rows.push(item);
    return { ...item };
  }

  async update(id: string, input: CubicacionItemUpdateInput): Promise<CubicacionItem | undefined> {
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    const now = new Date().toISOString();
    rows[idx] = { ...rows[idx], ...input, updatedAt: now };
    return { ...rows[idx] };
  }

  async delete(id: string): Promise<boolean> {
    const before = rows.length;
    rows = rows.filter((r) => r.id !== id);
    return rows.length < before;
  }
}
