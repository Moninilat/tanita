import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MeasurementHistoryPage from "../app/measurements/page";
import EditMeasurementPage from "../app/measurements/[id]/edit/page";
import { deleteMeasurement, updateMeasurement } from "../lib/measurements/actions";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(url);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/auth/server", () => ({
  requireAuthenticatedUser: async () => ({
    supabase: await createClientMock(),
    user: { id: "user-1" },
  }),
}));

const measurementRecord = {
  id: "m-1",
  profile_id: "p-1",
  location_id: "l-1",
  measured_at: "2026-09-25T08:30:00",
  notes: "Post-workout check-in",
  entry_method: "manual",
  weight_kg: 72.4,
  body_fat_pct: 17.2,
  bmr_kcal: 1552,
  bone_mass_kg: 2.7,
  visceral_fat_rating: 9,
  muscle_mass_kg: 52.5,
  muscle_quality_score: 75,
  physique_rating: 5,
  body_water_pct: 61.5,
  heart_rate_bpm: 62,
  metabolic_age: 31,
  abdomen_cm: 86,
  flexed_arm_cm: 34,
  arm_cm: 31,
  waist_cm: 76,
  hip_cm: 96,
  thigh_cm: 52,
};

const supabaseClient = {
  from: vi.fn((table: string) => {
    if (table === "profiles") {
      return {
        select: () => ({
          order: async () => ({
            data: [{ id: "p-1", name: "Ava" }],
            error: null,
          }),
        }),
      };
    }

    if (table === "locations") {
      return {
        select: () => ({
          order: async () => ({
            data: [{ id: "l-1", name: "Home" }],
            error: null,
          }),
        }),
      };
    }

    if (table === "measurements") {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: async () => ({ data: [measurementRecord], error: null }),
            }),
            maybeSingle: async () => ({ data: measurementRecord, error: null }),
          }),
        }),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  }),
};

describe("measurement edit and delete user flow", () => {
  it("persists updates and redirects back to the selected profile history", async () => {
    createClientMock.mockResolvedValue({
      from: vi.fn(() => ({
        update: () => ({
          eq: () => ({
            select: () => ({ maybeSingle: async () => ({ data: { id: "550e8400-e29b-41d4-a716-446655440000" }, error: null }) }),
          }),
        }),
      })),
    });

    const formData = new FormData();
    formData.set("measurement_id", "550e8400-e29b-41d4-a716-446655440000");
    formData.set("profile_id", "p-1");
    formData.set("location_id", "l-1");
    formData.set("measurement_date", "2026-09-25");
    formData.set("weight_kg", "72.4");

    await expect(updateMeasurement({ status: "idle", message: "", errors: [] }, formData)).rejects.toThrow(
      "/measurements?profile=p-1",
    );
  });

  it("deletes a measurement and redirects to the selected profile history", async () => {
    createClientMock.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "measurements") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { profile_id: "p-1" }, error: null }),
              }),
            }),
            delete: () => ({
              eq: () => ({
                select: () => ({ maybeSingle: async () => ({ data: { id: "550e8400-e29b-41d4-a716-446655440000" }, error: null }) }),
              }),
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const formData = new FormData();
    formData.set("measurement_id", "550e8400-e29b-41d4-a716-446655440000");

    await expect(deleteMeasurement(formData)).rejects.toThrow("/measurements?profile=p-1");
  });

  it("renders a direct edit link from the measurement history list", async () => {
    createClientMock.mockResolvedValue(supabaseClient);
    const html = renderToStaticMarkup(
      await MeasurementHistoryPage({ searchParams: Promise.resolve({ profile: "p-1" }) }),
    );

    expect(html).toContain("Edit measurement");
    expect(html).toContain("/measurements/m-1/edit");
  });

  it("loads the selected measurement into the edit form", async () => {
    createClientMock.mockResolvedValue(supabaseClient);
    const html = renderToStaticMarkup(
      await EditMeasurementPage({ params: Promise.resolve({ id: "m-1" }) }),
    );

    expect(html).toContain("Edit measurement");
    expect(html).toContain("Ava");
    expect(html).toContain("value=\"m-1\"");
    expect(html).toContain("/measurements?profile=p-1");
  });
});
