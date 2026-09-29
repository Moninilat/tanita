import { describe, expect, it } from "vitest";
import { buildMeasurementHistory, sortMeasurementHistory } from "../lib/measurements/history";

describe("measurement history", () => {
  it("orders newest measurements first using measured_at and id", () => {
    const ordered = sortMeasurementHistory([
      { id: "a", measured_at: "2026-01-01T00:00:00Z" },
      { id: "z", measured_at: "2026-01-01T00:00:00Z" },
      { id: "b", measured_at: "2026-03-01T00:00:00Z" },
    ]);

    expect(ordered.map((entry) => entry.id)).toEqual(["b", "z", "a"]);
  });

  it("keeps partial measurements and maps location names for display", () => {
    const history = buildMeasurementHistory(
      [
        {
          id: "m-1",
          measured_at: "2026-03-01T12:00:00Z",
          location_id: "loc-1",
          notes: "Morning check-in",
          weight_kg: 54.2,
          body_fat_pct: null,
          waist_cm: 65,
          hip_cm: null,
          entry_method: "manual",
        },
      ],
      {
        "loc-1": { id: "loc-1", name: "Home" },
      },
    );

    expect(history).toHaveLength(1);
    expect(history[0].locationName).toBe("Home");
    expect(history[0].details).toEqual([
      { label: "Weight", value: "54.2 kg" },
      { label: "Waist", value: "65.0 cm" },
    ]);
    expect(history[0].notes).toBe("Morning check-in");
  });
});
