import type {
  MetricHistoryEntry,
  MetricHistoryInput,
  MetricHistorySummary,
  MetricValue,
} from "./types";

export function calculateBodyFatMass(
  weightKg: MetricValue,
  bodyFatPct: MetricValue,
): MetricValue {
  if (weightKg === null || bodyFatPct === null) {
    return null;
  }

  return weightKg * bodyFatPct / 100;
}

export function calculateWaistToHipRatio(
  waistCm: MetricValue,
  hipCm: MetricValue,
): MetricValue {
  if (
    waistCm === null ||
    hipCm === null ||
    !Number.isFinite(waistCm) ||
    !Number.isFinite(hipCm) ||
    hipCm <= 0
  ) {
    return null;
  }

  return waistCm / hipCm;
}

export function calculateBmi(
  weightKg: MetricValue,
  heightCm: MetricValue,
): MetricValue {
  if (
    weightKg === null ||
    heightCm === null ||
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    heightCm <= 0
  ) {
    return null;
  }

  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

function sortHistory(history: MetricHistoryEntry[]): MetricHistoryEntry[] {
  return [...history].sort((left, right) => {
    const measuredAtDifference = left.measured_at.localeCompare(right.measured_at);
    return measuredAtDifference || left.id.localeCompare(right.id);
  });
}

function normalizeHistory(history: MetricHistoryInput): MetricHistoryEntry[] {
  if (history.length === 0) {
    return [];
  }

  if (history[0] !== null && typeof history[0] === "object") {
    return sortHistory(history as MetricHistoryEntry[]);
  }

  return (history as MetricValue[]).map((value, index) => ({
    value,
    measured_at: `${index}`,
    id: `${index}`,
  }));
}

export function summarizeMetricHistory(
  history: MetricHistoryInput,
): MetricHistorySummary {
  const orderedHistory = normalizeHistory(history);
  const observedValues = orderedHistory
    .map((entry) => entry.value)
    .filter((value): value is number => value !== null);
  const current = observedValues.at(-1) ?? null;
  const first = observedValues[0] ?? null;
  const previous = observedValues.at(-2) ?? null;

  return {
    current,
    first,
    previous,
    changeFromFirst: current === null || first === null ? null : current - first,
    changeFromPrevious:
      current === null || previous === null ? null : current - previous,
  };
}