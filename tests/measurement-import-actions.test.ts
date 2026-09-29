import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  commitHistoricalImport,
  inspectImportFile,
  previewHistoricalImport,
} from "../lib/measurements/import/actions";

const { createClientMock, insertMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  insertMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

let existingMeasurements: Array<Record<string, unknown>> = [];
let duplicateLookupFails = false;
let insertionFails = false;

const csvText = [
  "Date,Weight,Body Fat",
  "2026-09-01,54.2,",
  "2026-09-02,invalid,105",
  "2026-09-01,54.2,",
].join("\r\n");

function createFormData(options: {
  selectedRows?: number[];
  duplicateOverrides?: number[];
  duplicatesConfirmed?: boolean;
} = {}) {
  const formData = new FormData();
  formData.set("file", new File([csvText], "history.csv"), "history.csv");
  formData.set("profile_id", "profile-1");
  formData.set("profile_confirmed", "yes");
  formData.set("default_location_id", "location-1");
  formData.set("worksheet", "");
  formData.set("columns", JSON.stringify({
    Date: "measurement_date",
    Weight: "weight_kg",
    "Body Fat": "body_fat_pct",
  }));
  formData.set("date_format", "auto");
  formData.set("decimal_format", "decimal-point");
  formData.set("time_zone", "UTC");
  formData.set("selected_rows", JSON.stringify(options.selectedRows ?? []));
  formData.set("duplicate_overrides", JSON.stringify(options.duplicateOverrides ?? []));
  formData.set("duplicates_confirmed", options.duplicatesConfirmed ? "yes" : "no");
  return formData;
}

function configureSupabase() {
  createClientMock.mockImplementation(async () => ({
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: "profile-1" }, error: null }),
            }),
          }),
        };
      }
      if (table === "locations") {
        return {
          select: () => ({
            order: async () => ({
              data: [{ id: "location-1", name: "Home" }],
              error: null,
            }),
          }),
        };
      }
      if (table === "measurements") {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                lte: async () => ({
                  data: existingMeasurements,
                  error: duplicateLookupFails ? { message: "lookup error" } : null,
                }),
              }),
            }),
          }),
          insert: async (payload: unknown) => {
            await insertMock(payload);
            return { error: insertionFails ? { message: "insert error" } : null };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  }));
}

function matchingExistingMeasurement() {
  return {
    profile_id: "profile-1",
    location_id: "location-1",
    measured_at: "2026-09-01T12:00:00.000Z",
    entry_method: "manual",
    notes: null,
    weight_kg: 54.2,
    bmr_kcal: null,
    bone_mass_kg: null,
    visceral_fat_rating: null,
    body_fat_pct: null,
    muscle_mass_kg: null,
    muscle_quality_score: null,
    physique_rating: null,
    body_water_pct: null,
    heart_rate_bpm: null,
    metabolic_age: null,
    abdomen_cm: null,
    flexed_arm_cm: null,
    arm_cm: null,
    waist_cm: null,
    hip_cm: null,
    thigh_cm: null,
  };
}

beforeEach(() => {
  existingMeasurements = [];
  duplicateLookupFails = false;
  insertionFails = false;
  insertMock.mockReset();
  createClientMock.mockReset();
  configureSupabase();
});

describe("historical import server actions", () => {
  it("inspects file headers and sample rows without inserting", async () => {
    const formData = new FormData();
    formData.set("file", new File([csvText], "history.csv"), "history.csv");

    const result = await inspectImportFile(formData);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.headers).toEqual(["Date", "Weight", "Body Fat"]);
      expect(result.data.sampleRows[0].values).toEqual(["2026-09-01", "54.2", ""]);
    }
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("previews valid, invalid, and duplicate rows without writing", async () => {
    const result = await previewHistoricalImport(createFormData());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        totalRows: 3,
        validCount: 1,
        invalidCount: 1,
        duplicateCount: 1,
      });
      expect(result.data.rows[1].errors.map((error) => error.field)).toContain("weight_kg");
      expect(result.data.rows[2].duplicateOf).toBe("row 2");
    }
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("requires explicit profile confirmation at the server boundary", async () => {
    const formData = createFormData();
    formData.delete("profile_confirmed");

    const result = await previewHistoricalImport(formData);

    expect(result).toMatchObject({
      ok: false,
      message: "Confirm the target profile before previewing or importing rows.",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("commits only selected valid rows and reports partial-success counts", async () => {
    const result = await commitHistoricalImport(createFormData({ selectedRows: [2] }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        insertedCount: 1,
        invalidSkippedCount: 1,
        duplicateSkippedCount: 1,
        deselectedCount: 0,
        duplicateOverrideCount: 0,
      });
    }
    expect(insertMock).toHaveBeenCalledTimes(1);
    const insertedRows = insertMock.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(insertedRows[0]).toMatchObject({
      profile_id: "profile-1",
      location_id: "location-1",
      measured_at: "2026-09-01T12:00:00.000Z",
      entry_method: "import",
      weight_kg: 54.2,
      body_fat_pct: null,
    });
  });

  it("excludes an exact existing duplicate unless explicitly confirmed", async () => {
    existingMeasurements = [matchingExistingMeasurement()];

    const skipped = await commitHistoricalImport(createFormData({ selectedRows: [2] }));
    expect(skipped).toMatchObject({
      ok: true,
      data: { insertedCount: 0, duplicateSkippedCount: 2 },
    });
    expect(insertMock).not.toHaveBeenCalled();

    const overridden = await commitHistoricalImport(createFormData({
      selectedRows: [2],
      duplicateOverrides: [2],
      duplicatesConfirmed: true,
    }));
    expect(overridden).toMatchObject({
      ok: true,
      data: { insertedCount: 1, duplicateOverrideCount: 1 },
    });
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it("fails closed when duplicate lookup fails", async () => {
    duplicateLookupFails = true;

    const result = await commitHistoricalImport(createFormData({ selectedRows: [2] }));

    expect(result).toMatchObject({ ok: false, message: "Duplicate status could not be checked. No rows were imported." });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns a retryable failure when the bulk insert fails", async () => {
    insertionFails = true;

    const result = await commitHistoricalImport(createFormData({ selectedRows: [2] }));

    expect(result).toMatchObject({
      ok: false,
      message: "The selected rows could not be imported. No rows from this batch were added; the preview is still available for retry.",
    });
    expect(insertMock).toHaveBeenCalledTimes(1);
  });
});
