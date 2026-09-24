import {
  calculateBodyFatMass,
  calculateWaistToHipRatio,
  summarizeMetricHistory,
} from "../metrics";
import type { MetricHistoryEntry, MetricHistorySummary } from "../metrics";

export type DashboardMeasurement = {
  id: string;
  measured_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
};

export type DashboardMetricKey =
  | "weight"
  | "bodyFat"
  | "bodyFatMass"
  | "muscleMass"
  | "waist"
  | "waistToHipRatio";

export type DashboardSummary = Record<DashboardMetricKey, MetricHistorySummary>;

function history(
  measurements: DashboardMeasurement[],
  value: (measurement: DashboardMeasurement) => number | null,
): MetricHistoryEntry[] {
  return measurements.map((measurement) => ({
    value: value(measurement),
    measured_at: measurement.measured_at,
    id: measurement.id,
  }));
}

export function summarizeDashboard(
  measurements: DashboardMeasurement[],
): DashboardSummary {
  return {
    weight: summarizeMetricHistory(history(measurements, (measurement) => measurement.weight_kg)),
    bodyFat: summarizeMetricHistory(history(measurements, (measurement) => measurement.body_fat_pct)),
    bodyFatMass: summarizeMetricHistory(
      history(measurements, (measurement) =>
        calculateBodyFatMass(measurement.weight_kg, measurement.body_fat_pct),
      ),
    ),
    muscleMass: summarizeMetricHistory(history(measurements, (measurement) => measurement.muscle_mass_kg)),
    waist: summarizeMetricHistory(history(measurements, (measurement) => measurement.waist_cm)),
    waistToHipRatio: summarizeMetricHistory(
      history(measurements, (measurement) =>
        calculateWaistToHipRatio(measurement.waist_cm, measurement.hip_cm),
      ),
    ),
  };
}

export function formatMetricValue(value: number | null, decimals: number): string {
  return value === null ? "—" : value.toFixed(decimals);
}

export function formatSignedChange(
  value: number | null,
  decimals: number,
  unit: string,
): string {
  if (value === null) {
    return "—";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)} ${unit}`;
}