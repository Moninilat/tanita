import { describe, expect, it } from "vitest";
import {
  formatMetricValue,
  formatSignedChange,
  summarizeDashboard,
} from "../lib/dashboard/data";

const measurement = (
  id: string,
  measured_at: string,
  values: Partial<{
    weight_kg: number;
    body_fat_pct: number;
    muscle_mass_kg: number;
    waist_cm: number;
    hip_cm: number;
  }> = {},
) => ({
  id,
  measured_at,
  weight_kg: values.weight_kg ?? null,
  body_fat_pct: values.body_fat_pct ?? null,
  muscle_mass_kg: values.muscle_mass_kg ?? null,
  waist_cm: values.waist_cm ?? null,
  hip_cm: values.hip_cm ?? null,
});

describe("dashboard summaries", () => {
  it("summarizes weight using the metric engine", () => {
    const summary = summarizeDashboard([
      measurement("a", "2026-09-01", { weight_kg: 55.05 }),
      measurement("b", "2026-09-11", { weight_kg: 53.8 }),
    ]).weight;

    expect(summary.current).toBe(53.8);
    expect(summary.changeFromFirst).toBe(-1.25);
    expect(summary.changeFromPrevious).toBe(-1.25);
  });

  it("summarizes historical body-fat mass and skips incomplete rows", () => {
    const summary = summarizeDashboard([
      measurement("a", "2026-01-01", { weight_kg: 60, body_fat_pct: 30 }),
      measurement("b", "2026-02-01", { weight_kg: 59 }),
      measurement("c", "2026-03-01", { weight_kg: 58, body_fat_pct: 25 }),
    ]).bodyFatMass;

    expect(summary).toEqual({
      current: 14.5,
      first: 18,
      previous: 18,
      changeFromFirst: -3.5,
      changeFromPrevious: -3.5,
    });
  });

  it("summarizes historical waist-to-hip ratios and skips incomplete rows", () => {
    const summary = summarizeDashboard([
      measurement("a", "2026-01-01", { waist_cm: 66, hip_cm: 93.5 }),
      measurement("b", "2026-02-01", { waist_cm: 65 }),
      measurement("c", "2026-03-01", { waist_cm: 64, hip_cm: 92 }),
    ]).waistToHipRatio;

    expect(summary.current).toBeCloseTo(64 / 92);
    expect(summary.first).toBeCloseTo(66 / 93.5);
    expect(summary.previous).toBeCloseTo(66 / 93.5);
  });

  it("keeps missing metrics and comparisons unavailable", () => {
    const summary = summarizeDashboard([measurement("a", "2026-01-01")]);

    expect(summary.bodyFat.current).toBeNull();
    expect(summary.bodyFat.changeFromPrevious).toBeNull();
    expect(summary.weight.current).toBeNull();
  });

  it("formats percentage-point changes and signed values", () => {
    expect(formatMetricValue(null, 2)).toBe("—");
    expect(formatSignedChange(-5, 1, "pp")).toBe("-5.0 pp");
    expect(formatSignedChange(1.25, 2, "kg")).toBe("+1.25 kg");
    expect(formatSignedChange(null, 2, "kg")).toBe("—");
  });
});