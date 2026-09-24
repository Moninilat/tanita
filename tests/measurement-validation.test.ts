import { describe, expect, it } from "vitest";
import {
  combineMeasurementDateTime,
  parseMeasurementForm,
} from "../lib/measurements/validation";

function formData(values: Record<string, string> = {}) {
  const data = new FormData();
  data.set("profile_id", "profile-1");
  data.set("location_id", "location-1");
  data.set("measurement_date", "2026-09-24");
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe("measurement form validation", () => {
  it("rejects a form without body metrics", () => {
    const result = parseMeasurementForm(formData());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain("Enter at least one body measurement.");
  });

  it("accepts a weight-only measurement", () => {
    const result = parseMeasurementForm(formData({ weight_kg: "53.8" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.weight_kg).toBe(53.8);
      expect(result.payload.entry_method).toBe("manual");
    }
  });

  it("converts empty numeric fields to null", () => {
    const result = parseMeasurementForm(formData({ weight_kg: "53.8", body_fat_pct: "" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.body_fat_pct).toBeNull();
  });

  it("validates percentages and visceral fat", () => {
    expect(parseMeasurementForm(formData({ body_fat_pct: "120" })).ok).toBe(false);
    expect(parseMeasurementForm(formData({ body_fat_pct: "25.6" })).ok).toBe(true);
    expect(parseMeasurementForm(formData({ visceral_fat_rating: "0" })).ok).toBe(false);
    expect(parseMeasurementForm(formData({ visceral_fat_rating: "60" })).ok).toBe(false);
    expect(parseMeasurementForm(formData({ visceral_fat_rating: "5.5" })).ok).toBe(true);
  });

  it("rejects negative physical measurements", () => {
    expect(parseMeasurementForm(formData({ weight_kg: "-1" })).ok).toBe(false);
    expect(parseMeasurementForm(formData({ waist_cm: "-2" })).ok).toBe(false);
  });

  it("uses local noon when no time is supplied", () => {
    expect(combineMeasurementDateTime("2026-09-24", "")).toBe("2026-09-24T12:00:00");
    expect(combineMeasurementDateTime("2026-09-24", "08:30")).toBe("2026-09-24T08:30:00");
  });

  it("rejects invalid dates and times", () => {
    expect(parseMeasurementForm(formData({ measurement_date: "2026-02-30" })).ok).toBe(false);
    expect(parseMeasurementForm(formData({ measurement_time: "25:00", weight_kg: "53.8" })).ok).toBe(false);
  });
});