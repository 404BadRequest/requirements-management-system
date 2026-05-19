export type TrafficRisk = "verde" | "amarillo" | "rojo";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toDateOnly(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

export function calculateElapsedContractPct(params: {
  startDate: string;
  endDate: string;
  nowDate?: string;
}): number {
  const now = toDateOnly(params.nowDate ?? new Date().toISOString().slice(0, 10));
  const start = toDateOnly(params.startDate);
  const end = toDateOnly(params.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end.getTime() <= start.getTime()) return now >= end ? 1 : 0;
  if (now <= start) return 0;
  if (now >= end) return 1;
  const elapsed = now.getTime() - start.getTime();
  const total = end.getTime() - start.getTime();
  return clamp(elapsed / total, 0, 1);
}

export function calculateDeviationMetrics(params: {
  quotedMinutes: number;
  usedMinutes: number;
  elapsedPct: number;
}): {
  expectedMinutesByDate: number;
  deviationMinutes: number;
  deviationPct: number;
  risk: TrafficRisk;
} {
  const expectedMinutesByDate = params.quotedMinutes * clamp(params.elapsedPct, 0, 1);
  const deviationMinutes = params.usedMinutes - expectedMinutesByDate;
  const denominator = Math.max(expectedMinutesByDate, 1);
  const deviationPct = Math.abs(deviationMinutes / denominator) * 100;
  const risk = deviationPct <= 10 ? "verde" : deviationPct <= 20 ? "amarillo" : "rojo";
  return { expectedMinutesByDate, deviationMinutes, deviationPct, risk };
}

export function calculateMisallocationMetrics(params: {
  unallocatedMinutes: number;
  usedMinutes: number;
}): { misallocationPct: number; risk: TrafficRisk } {
  const misallocationPct = params.usedMinutes > 0 ? (params.unallocatedMinutes / params.usedMinutes) * 100 : 0;
  const risk = misallocationPct < 3 ? "verde" : misallocationPct <= 8 ? "amarillo" : "rojo";
  return { misallocationPct, risk };
}

export function calculateCoverageRisk(consumptionPct: number): TrafficRisk {
  if (consumptionPct < 70) return "verde";
  if (consumptionPct <= 90) return "amarillo";
  return "rojo";
}

export function estimateDepletionDate(params: {
  availableMinutes: number;
  burnRateMinutesPerWeek: number;
  nowDate?: string;
}): {
  estimatedDepletionDate: string | null;
  daysToDepletion: number | null;
} {
  if (params.availableMinutes <= 0) {
    return { estimatedDepletionDate: params.nowDate ?? new Date().toISOString().slice(0, 10), daysToDepletion: 0 };
  }
  if (params.burnRateMinutesPerWeek <= 0) {
    return { estimatedDepletionDate: null, daysToDepletion: null };
  }

  const now = toDateOnly(params.nowDate ?? new Date().toISOString().slice(0, 10));
  const weeks = params.availableMinutes / params.burnRateMinutesPerWeek;
  const daysToDepletion = Math.ceil(weeks * 7);
  const depletionDate = new Date(now.getTime() + daysToDepletion * 24 * 60 * 60 * 1000);
  return {
    estimatedDepletionDate: depletionDate.toISOString().slice(0, 10),
    daysToDepletion,
  };
}

export function calculateContractHealthScore(params: {
  deviationPct: number;
  misallocationPct: number;
  worstProfileCoveragePct: number;
}): { score: number; risk: TrafficRisk } {
  const deviationPenalty = clamp(params.deviationPct * 2.5, 0, 100);
  const misallocationPenalty = clamp(params.misallocationPct * 12.5, 0, 100);
  const profilePenalty = clamp((params.worstProfileCoveragePct - 60) * 2.5, 0, 100);
  const weightedPenalty = deviationPenalty * 0.4 + misallocationPenalty * 0.3 + profilePenalty * 0.3;
  const score = Math.round(clamp(100 - weightedPenalty, 0, 100));
  const risk = score >= 80 ? "verde" : score >= 60 ? "amarillo" : "rojo";
  return { score, risk };
}
