import { describe, expect, it } from "vitest";
import { resolveContractIdByContext, resolveContractIdForTimeEntry } from "@/lib/contracts/resolve-contract";
import type { ContractBudget, Requirement } from "@/types/domain";

const contracts: ContractBudget[] = [
  {
    id: "contract-pr",
    clientId: "client-a",
    projectId: "proj-main",
    scope: "PR",
    code: "CTR-001",
    name: "Proyecto",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    rateUfPerHour: 1,
    markupPercentage: 40,
    opexPercentage: 10,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const requirements: Requirement[] = [
  {
    id: "req-1",
    projectId: "proj-main",
    clientId: "client-a",
    contractId: null,
    origin: "internal",
    title: "Sin contrato",
    description: "",
    priority: "medium",
    ownerId: "user-1",
    status: "open",
    notes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    completedAt: null,
  },
];

describe("resolveContractIdByContext", () => {
  it("resuelve el único contrato vigente del cliente", () => {
    expect(
      resolveContractIdByContext({
        contractId: null,
        clientId: "client-a",
        projectId: "proj-main",
        atDate: "2026-06-09",
        contracts,
      }),
    ).toBe("contract-pr");
  });
});

describe("resolveContractIdForTimeEntry", () => {
  it("usa clientId del payload cuando el requerimiento no tiene contrato", () => {
    expect(
      resolveContractIdForTimeEntry({
        contractId: null,
        requirementId: "req-1",
        clientId: "client-a",
        projectId: "proj-main",
        date: "2026-06-09",
        requirements,
        contracts,
      }),
    ).toBe("contract-pr");
  });
});
