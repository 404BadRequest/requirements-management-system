import { describe, expect, it } from "vitest";
import {
  calculateBudgetAvailableMinutes,
  calculateBudgetUsedMinutes,
  detectOverrun,
} from "@/lib/calculations/budget";
import {
  calculateDurationMinutes,
  groupHoursByCategory,
  groupHoursByMonth,
  groupHoursByPerson,
  validateEndTimeAfterStart,
} from "@/lib/calculations/time";
import { aggregateBillingEstimateByClient, calculateBillingAmount } from "@/lib/calculations/billing";
import { convertBillingAmountToClp } from "@/lib/calculations/currency-to-clp";
import { calculateDashboardMetrics } from "@/lib/calculations/dashboard";
import {
  calculateContractConsumptions,
  resolveBillableMinutesForContractEntry,
} from "@/lib/calculations/contract-budget";
import { formatDurationAsHms } from "@/lib/export/time-entries-workbook";
import { formatBillingLineTotal, formatHourlyRateDisplay } from "@/lib/formatting/rates";
import { normalizeName } from "@/lib/normalization/users";
import { budgetsMock } from "@/data/mock/budgets";
import { requirementsMock } from "@/data/mock/requirements";
import { timeEntriesMock } from "@/data/mock/time-entries";
import type { Client, Profile, Requirement, TimeEntry, User } from "@/types/domain";

describe("calculations", () => {
  it("calcula duración entre horas", () => {
    expect(calculateDurationMinutes("09:00", "11:30")).toBe(150);
  });

  it("valida hora término posterior", () => {
    expect(validateEndTimeAfterStart("10:00", "11:00")).toBe(true);
    expect(validateEndTimeAfterStart("10:00", "09:00")).toBe(false);
  });

  it("calcula presupuesto usado y disponible", () => {
    const used = calculateBudgetUsedMinutes(timeEntriesMock.slice(0, 3));
    const available = calculateBudgetAvailableMinutes(1000, used);
    expect(used).toBeGreaterThan(0);
    expect(available).toBeLessThan(1000);
  });

  it("detecta sobregiro", () => {
    expect(detectOverrun(100, 101)).toBe(true);
    expect(detectOverrun(100, 80)).toBe(false);
  });

  it("agrupa horas por persona", () => {
    const grouped = groupHoursByPerson(timeEntriesMock.slice(0, 20));
    expect(Object.keys(grouped).length).toBeGreaterThan(1);
  });

  it("agrupa horas por categoría", () => {
    const grouped = groupHoursByCategory(timeEntriesMock.slice(0, 20));
    expect(grouped["Proyecto"]).toBeGreaterThan(0);
  });

  it("agrupa horas por mes", () => {
    const grouped = groupHoursByMonth(timeEntriesMock);
    expect(Object.keys(grouped).length).toBeGreaterThan(1);
  });

  it("normaliza nombres", () => {
    expect(normalizeName("Verónica   Reveco")).toBe("veronica reveco");
  });

  it("calcula métricas dashboard", () => {
    const metrics = calculateDashboardMetrics(requirementsMock, timeEntriesMock, budgetsMock);
    expect(metrics.totalRequirements).toBe(60);
    expect(metrics.totalHours).toBeGreaterThan(0);
    expect(metrics.billingEstimateByClient).toEqual([]);
  });

  it("agrega estimado por cliente usando tarifa del usuario", () => {
    const reqs: Requirement[] = [
      {
        id: "r1",
        projectId: "p1",
        clientId: "client-esval",
        contractId: null,
        origin: "Cliente",
        title: "T",
        description: "D",
        priority: "P2",
        ownerId: "u1",
        status: "BACKLOG",
        notes: "",
        createdAt: "",
        updatedAt: "",
        completedAt: null,
      },
    ];
    const reqMap = new Map(reqs.map((r) => [r.id, r]));
    const users: User[] = [
      {
        id: "u1",
        name: "Test",
        email: "t@t.com",
        aliases: [],
        profileId: "profile-engineer",
        active: true,
        role: "Contributor",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const profiles: Profile[] = [
      {
        id: "profile-engineer",
        name: "Ingeniero",
        hourlyRate: 72000,
        rateCurrency: "CLP",
        active: true,
        createdAt: "",
        updatedAt: "",
      },
    ];
    const entries: TimeEntry[] = [
      {
        id: "e1",
        projectId: "p1",
        clientId: null,
        requirementId: "r1",
        contractId: null,
        contractProfileId: null,
        category: "Proyecto",
        taskDescription: "x",
        date: "2026-01-01",
        startTime: "09:00",
        endTime: "11:00",
        durationMinutes: 120,
        userId: "u1",
        observations: "",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const clients: Client[] = [
      {
        id: "client-esval",
        name: "ESVAL",
        code: "X",
        active: true,
        createdAt: "",
        updatedAt: "",
      },
    ];
    const clientsById = new Map(clients.map((c) => [c.id, c]));
    const referenceRates = { id: "default", ufToClp: 40000, usdToClp: 1000, weeklyCapacityHours: 40, updatedAt: "" };
    const rows = aggregateBillingEstimateByClient(
      entries,
      reqMap,
      new Map(users.map((u) => [u.id, u])),
      new Map(profiles.map((p) => [p.id, p])),
      clientsById,
      referenceRates,
    );
    expect(rows).toEqual([{ client: "ESVAL", currency: "CLP", amount: 2 * 72000, amountClp: 2 * 72000 }]);
  });

  it("calcula monto facturable lineal", () => {
    expect(calculateBillingAmount(2, 50000)).toBe(100000);
  });

  it("convierte montos UF y USD a CLP con tasas de referencia", () => {
    const rates = { id: "default", ufToClp: 40_000, usdToClp: 900, weeklyCapacityHours: 40, updatedAt: "" };
    expect(convertBillingAmountToClp(5, "UF", rates)).toBe(200_000);
    expect(convertBillingAmountToClp(2, "USD", rates)).toBe(1800);
    expect(convertBillingAmountToClp(100, "CLP", rates)).toBe(100);
    expect(convertBillingAmountToClp(1, "EUR", rates)).toBeNull();
  });

  it("formatea tarifa CLP y UF", () => {
    expect(formatHourlyRateDisplay(125000, "CLP")).toContain("125");
    expect(formatHourlyRateDisplay(2.5, "UF")).toContain("UF");
    expect(formatBillingLineTotal(10, "UF")).toContain("UF");
  });

  it("formatea duración como H:MM:SS para exportación Excel", () => {
    expect(formatDurationAsHms(30)).toBe("0:30:00");
    expect(formatDurationAsHms(60)).toBe("1:00:00");
    expect(formatDurationAsHms(90)).toBe("1:30:00");
  });

  it("descuenta horas reloj cuando el perfil contractual coincide con el real", () => {
    const referenceRates = { id: "default", ufToClp: 40550, usdToClp: 950, weeklyCapacityHours: 40, updatedAt: "" };
    const juniorProfile = {
      id: "prof-junior",
      name: "Ingeniero junior",
      hourlyRate: 0.15,
      rateCurrency: "UF",
      active: true,
      createdAt: "",
      updatedAt: "",
    };
    const billable = resolveBillableMinutesForContractEntry({
      durationMinutes: 253,
      workerProfileId: "prof-junior",
      targetProfileId: "prof-junior",
      workerProfile: juniorProfile,
      targetUfRate: 1,
      referenceRates,
    });
    expect(billable).toBe(253);
  });

  it("ajusta consumo por tarifa UF cuando el perfil contractual es distinto", () => {
    const referenceRates = { id: "default", ufToClp: 40550, usdToClp: 950, weeklyCapacityHours: 40, updatedAt: "" };
    const juniorProfile = {
      id: "prof-junior",
      name: "Ingeniero junior",
      hourlyRate: 0.15,
      rateCurrency: "UF",
      active: true,
      createdAt: "",
      updatedAt: "",
    };
    const billable = resolveBillableMinutesForContractEntry({
      durationMinutes: 120,
      workerProfileId: "prof-junior",
      targetProfileId: "prof-senior",
      workerProfile: juniorProfile,
      targetUfRate: 1,
      referenceRates,
    });
    expect(billable).toBeCloseTo(18, 5);
  });

  it("agrega consumo por perfil con horas reloj cuando el perfil coincide", () => {
    const referenceRates = { id: "default", ufToClp: 40550, usdToClp: 950, weeklyCapacityHours: 40, updatedAt: "" };
    const profiles = [
      {
        id: "prof-junior",
        name: "Ingeniero junior",
        hourlyRate: 0.15,
        rateCurrency: "UF",
        active: true,
        createdAt: "",
        updatedAt: "",
      },
    ];
    const users = [
      {
        id: "user-j",
        name: "Joaquín",
        email: "j@x.com",
        aliases: [],
        profileId: "prof-junior",
        active: true,
        role: "Contributor" as const,
        createdAt: "",
        updatedAt: "",
      },
    ];
    const contracts = [
      {
        id: "contract-1",
        clientId: "client-1",
        projectId: "proj-main",
        scope: "Proyecto",
        code: "CTR-001",
        name: "Contrato",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        rateUfPerHour: 1,
        markupPercentage: 40,
        opexPercentage: 10,
        active: true,
        createdAt: "",
        updatedAt: "",
      },
    ];
    const allocations = [
      {
        id: "alloc-j",
        contractId: "contract-1",
        profileId: "prof-junior",
        quotedMinutes: 3780,
        rateUfPerHour: null,
        createdAt: "",
        updatedAt: "",
      },
    ];
    const entries = [
      {
        id: "te-1",
        projectId: "proj-main",
        clientId: "client-1",
        requirementId: "req-1",
        contractId: "contract-1",
        contractProfileId: "prof-junior",
        category: "Proyecto",
        taskDescription: "Trabajo",
        date: "2026-06-01",
        startTime: "09:00",
        endTime: "13:22",
        durationMinutes: 262,
        userId: "user-j",
        observations: "",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const consumption = calculateContractConsumptions({
      contracts,
      allocations,
      entries,
      users,
      profiles,
      referenceRates,
    });
    expect(consumption.byContractProfile[0]?.usedMinutes).toBe(262);
    expect(consumption.byContractProfile[0]?.usedMinutes / 60).toBeCloseTo(4.37, 2);
  });
});
