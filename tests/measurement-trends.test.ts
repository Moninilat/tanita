import { describe, expect, it } from "vitest";
import {
  buildMeasurementTrends,
  resolveTrendProfileId,
  sortMeasurementTrends,
} from "../lib/measurements/trends";

describe("measurement trends", () => {
  it("orders by measured_at and uses ascending id for equal instants", () => {
    const sorted = sortMeasurementTrends([
      { id: "c", measured_at: "2026-09-25T10:00:00Z" },
      { id: "b", measured_at: "2026-09-25T12:00:00+02:00" },
      { id: "a", measured_at: "2026-09-24T10:00:00Z" },
    ]);

    expect(sorted.map((row) => row.id)).toEqual(["a", "b", "c"]);
  });

  it("preserves every timestamp and leaves missing metric observations null", () => {
    const series = buildMeasurementTrends([
      { id: "m-2", measured_at: "2026-09-20T10:00:00Z", weight_kg: null },
      { id: "m-1", measured_at: "2026-09-10T10:00:00Z", weight_kg: 0 },
    ]);
    const weight = series.find((metric) => metric.field === "weight_kg");

    expect(weight?.points).toEqual([
      { id: "m-1", measured_at: "2026-09-10T10:00:00Z", value: 0 },
      { id: "m-2", measured_at: "2026-09-20T10:00:00Z", value: null },
    ]);
    expect(weight?.hasValues).toBe(true);
  });

  it("uses the right persisted field and unit for all four chart series", () => {
    const series = buildMeasurementTrends([
      {
        id: "m-1",
        measured_at: "2026-09-20T10:00:00Z",
        weight_kg: 70.25,
        body_fat_pct: 21.5,
        muscle_mass_kg: 51.1,
        waist_cm: 82.4,
      },
    ]);

    expect(series.map(({ field, label, unit, points }) => ({
      field,
      label,
      unit,
      value: points[0].value,
    }))).toEqual([
      { field: "weight_kg", label: "Weight", unit: "kg", value: 70.25 },
      { field: "body_fat_pct", label: "Body fat", unit: "%", value: 21.5 },
      { field: "muscle_mass_kg", label: "Muscle mass", unit: "kg", value: 51.1 },
      { field: "waist_cm", label: "Waist", unit: "cm", value: 82.4 },
    ]);
  });

  it("marks an all-missing metric as empty without creating a zero series", () => {
    const series = buildMeasurementTrends([
      { id: "m-1", measured_at: "2026-09-20T10:00:00Z", body_fat_pct: null },
    ]);
    const bodyFat = series.find((metric) => metric.field === "body_fat_pct");

    expect(bodyFat?.hasValues).toBe(false);
    expect(bodyFat?.points.map((point) => point.value)).toEqual([null]);
  });

  it("uses a valid requested profile and only auto-selects a single profile", () => {
    const profiles = [
      { id: "p-1", name: "Ava" },
      { id: "p-2", name: "Kai" },
    ];

    expect(resolveTrendProfileId(profiles, "p-2")).toBe("p-2");
    expect(resolveTrendProfileId(profiles, undefined)).toBeNull();
    expect(resolveTrendProfileId(profiles, "invalid")).toBeNull();
    expect(resolveTrendProfileId([profiles[0]], undefined)).toBe("p-1");
  });
});