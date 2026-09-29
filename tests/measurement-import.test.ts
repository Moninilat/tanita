import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { classifyImportDuplicates, importFingerprint, summarizeImportRows } from "../lib/measurements/import/duplicates";
import { parseMeasurementDateTime } from "../lib/measurements/import/date-time";
import { normalizeImportHeader, suggestImportMapping, validateImportMapping } from "../lib/measurements/import/mapping";
import { parseImportNumber } from "../lib/measurements/import/numeric";
import { parseImportFile } from "../lib/measurements/import/parser";
import { validateImportRow } from "../lib/measurements/import/validation";
import type { ImportMapping, ImportPreviewRow, ParsedImportFile } from "../lib/measurements/import/types";

const baseMapping: ImportMapping = {
  columns: { Date: "measurement_date", Weight: "weight_kg" },
  dateFormat: "auto",
  decimalFormat: "decimal-point",
  timeZone: "UTC",
  defaultLocationId: "location-1",
  worksheet: "",
};

function textCell(value: string | null) {
  return { value };
}

function makeTable(headers: string[], values: (string | number | null)[]): ParsedImportFile {
  return {
    fileName: "measurements.csv",
    headers,
    rows: [{ rowNumber: 2, cells: values.map((value) => ({ value })) }],
    headerErrors: [],
    worksheets: [],
    worksheet: "",
    date1904: false,
  };
}

function makePreviewRow(
  rowNumber: number,
  weight: number | null,
  measuredAt = "2026-09-01T12:00:00.000Z",
): ImportPreviewRow {
  return {
    rowNumber,
    status: "valid",
    measuredAt,
    locationName: "Home",
    values: { weight_kg: weight === null ? null : String(weight) },
    payload: {
      profile_id: "profile-1",
      location_id: "location-1",
      measured_at: measuredAt,
      entry_method: "import",
      weight_kg: weight,
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
      notes: null,
    },
    errors: [],
    duplicateOf: null,
  };
}

describe("historical measurement import parsing", () => {
  it("parses BOM CSV, quoted delimiters, and skips blank records", async () => {
    const file = new File(
      ["\uFEFFDate,Weight,Notes\r\n2026-09-01,54.2,\"Check-in, morning\"\r\n,,\r\n2026-09-02,53.9,\"Second row\""],
      "history.csv",
    );
    const table = await parseImportFile(file);

    expect(table.headers).toEqual(["Date", "Weight", "Notes"]);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0].cells[2].value).toBe("Check-in, morning");
  });

  it("parses the selected visible XLSX worksheet and preserves typed dates and formulas", async () => {
    const workbook = new ExcelJS.Workbook();
    const visible = workbook.addWorksheet("Measurements");
    workbook.addWorksheet("Hidden", { state: "hidden" });
    visible.addRow(["Date", "Weight", "Unsupported"]);
    const date = visible.addRow([new Date(Date.UTC(2026, 8, 1)), 54.25, null]);
    date.getCell(1).numFmt = "yyyy-mm-dd";
    date.getCell(3).value = { formula: "1+1" };
    const bytes = await workbook.xlsx.writeBuffer();
    const file = new File([new Uint8Array(bytes).buffer as ArrayBuffer], "history.xlsx");
    const table = await parseImportFile(file, "Measurements");

    expect(table.worksheets).toEqual(["Measurements"]);
    expect(table.rows[0].cells[0].value).toBeInstanceOf(Date);
    expect(table.rows[0].cells[1].value).toBe(54.25);
    expect(table.rows[0].cells[2].formulaError).toBe(true);
  });

  it("rejects unsupported file extensions and malformed UTF-8", async () => {
    await expect(parseImportFile(new File(["a"], "history.xls"))).rejects.toThrow(".csv or .xlsx");
    await expect(parseImportFile(new File([new Uint8Array([0xc3, 0x28])], "history.csv"))).rejects.toThrow("UTF-8");
    await expect(parseImportFile(new File(["Date,Weight\n2026-09-01,54,extra"], "wide-row.csv"))).rejects.toThrow("different number of columns");
    await expect(parseImportFile(new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], "not-csv.csv"))).rejects.toThrow("does not look like a UTF-8 CSV");
  });

  it("rejects workbooks with too many visible worksheets", async () => {
    const workbook = new ExcelJS.Workbook();
    for (let index = 0; index < 21; index += 1) {
      workbook.addWorksheet(`Sheet ${index + 1}`);
    }
    const bytes = await workbook.xlsx.writeBuffer();
    const file = new File([new Uint8Array(bytes).buffer as ArrayBuffer], "many-sheets.xlsx");

    await expect(parseImportFile(file)).rejects.toThrow("more than 20 visible worksheets");
  });
});

describe("historical measurement mapping and values", () => {
  it("normalizes headers and suggests only supported, unambiguous destinations", () => {
    expect(normalizeImportHeader("Body Fat (%)")).toBe("body_fat_pct");
    expect(suggestImportMapping(["Date", "Weight (kg)", "Body Fat (%)", "profile_id"])).toEqual({
      Date: "measurement_date",
      "Weight (kg)": "weight_kg",
      "Body Fat (%)": "body_fat_pct",
    });
  });

  it("requires a date and a metric and rejects duplicate destination mappings", () => {
    expect(validateImportMapping(["Date", "Weight", "Weight 2"], {
      ...baseMapping,
      columns: { Date: "measurement_date", Weight: "weight_kg", "Weight 2": "weight_kg" },
    })).toContain("Only one source column may map to weight_kg.");
    expect(validateImportMapping(["Notes"], {
      ...baseMapping,
      columns: { Notes: "notes" },
    })).toContain("Map a source column to the measurement date.");
  });

  it("parses decimal conventions strictly and keeps blank distinct from zero", () => {
    expect(parseImportNumber(textCell(""), "weight_kg", "decimal-point")).toEqual({ ok: true, value: null });
    expect(parseImportNumber(textCell("0"), "body_fat_pct", "decimal-point")).toEqual({ ok: true, value: 0 });
    expect(parseImportNumber(textCell("54,25"), "weight_kg", "decimal-comma")).toEqual({ ok: true, value: 54.25 });
    expect(parseImportNumber(textCell("54kg"), "weight_kg", "decimal-point").ok).toBe(false);
    expect(parseImportNumber(textCell("12.5"), "heart_rate_bpm", "decimal-point").ok).toBe(false);
    expect(parseImportNumber(textCell("54.1234"), "weight_kg", "decimal-point").ok).toBe(false);
  });

  it("maps a decimal-comma CSV row to its intended metric without splitting the value", async () => {
    const file = new File(["Date;Weight;Notes\n2026-09-01;54,25;Check-in"], "comma.csv");
    const table = await parseImportFile(file);
    expect(table.headers).toEqual(["Date", "Weight", "Notes"]);
    expect(table.rows[0].cells[1].value).toBe("54,25");
  });

  it("uses source dates, offsets, Excel serial dates, and rejects ambiguous or invalid local times", () => {
    const table = makeTable([], []);
    expect(parseMeasurementDateTime(
      { value: "2026-09-01" }, undefined, table, { dateFormat: "auto", timeZone: "UTC" },
    )).toEqual({ ok: true, value: "2026-09-01T12:00:00.000Z" });
    expect(parseMeasurementDateTime(
      { value: "2026-09-01T08:30:00-04:00" }, undefined, table, { dateFormat: "auto", timeZone: "UTC" },
    )).toEqual({ ok: true, value: "2026-09-01T12:30:00.000Z" });
    expect(parseMeasurementDateTime(
      { value: 46266 }, undefined, table, { dateFormat: "auto", timeZone: "UTC" },
    )).toEqual({ ok: true, value: "2026-09-01T12:00:00.000Z" });
    expect(parseMeasurementDateTime(
      { value: "2026-09-01" }, { value: "08:30" }, table,
      { dateFormat: "auto", timeZone: "UTC" },
    )).toEqual({ ok: true, value: "2026-09-01T08:30:00.000Z" });
    expect(parseMeasurementDateTime(
      { value: "09/01/2026" }, undefined, table, { dateFormat: "auto", timeZone: "UTC" },
    ).ok).toBe(false);
    expect(parseMeasurementDateTime(
      { value: "09/01/2026" }, undefined, table, { dateFormat: "month-first", timeZone: "UTC" },
    ).ok).toBe(true);
    expect(parseMeasurementDateTime(
      { value: "2026-03-08" }, { value: "02:30" }, table,
      { dateFormat: "auto", timeZone: "America/New_York" },
    ).ok).toBe(false);
    expect(parseMeasurementDateTime(
      { value: "2026-11-01" }, { value: "01:30" }, table,
      { dateFormat: "auto", timeZone: "America/New_York" },
    ).ok).toBe(false);
  });

  it("validates rows with NULL blanks, required metrics, ranges, and location fallback", () => {
    const table = makeTable(["Date", "Weight", "Fat", "Notes"], [
      "2026-09-01", "54.25", "", "Morning check-in",
    ]);
    const mapping = {
      ...baseMapping,
      columns: {
        Date: "measurement_date",
        Weight: "weight_kg",
        Fat: "body_fat_pct",
        Notes: "notes",
      },
    } as ImportMapping;
    const result = validateImportRow(table.rows[0], table, mapping, "profile-1", [
      { id: "location-1", name: "Home" },
    ]);

    expect(result.status).toBe("valid");
    expect(result.payload?.weight_kg).toBe(54.25);
    expect(result.payload?.body_fat_pct).toBeNull();
    expect(result.payload?.measured_at).toBe("2026-09-01T12:00:00.000Z");
    expect(result.payload?.entry_method).toBe("import");

    const invalidTable = makeTable(["Date", "Fat"], ["2026-09-01", "101"]);
    const invalid = validateImportRow(invalidTable.rows[0], invalidTable, {
      ...baseMapping,
      columns: { Date: "measurement_date", Fat: "body_fat_pct" },
    }, "profile-1", [{ id: "location-1", name: "Home" }]);
    expect(invalid.status).toBe("invalid");
    expect(invalid.errors.some((error) => error.field === "body_fat_pct")).toBe(true);
  });

  it("resolves source locations by name and reports unknown locations", () => {
    const table = makeTable(["Date", "Weight", "Location"], ["2026-09-01", "54", " hOmE "]);
    const mapping = {
      ...baseMapping,
      columns: { Date: "measurement_date", Weight: "weight_kg", Location: "location" },
    } as ImportMapping;
    const valid = validateImportRow(table.rows[0], table, mapping, "profile-1", [
      { id: "location-1", name: "Home" },
    ]);
    expect(valid.payload?.location_id).toBe("location-1");

    table.rows[0].cells[2] = { value: "Unknown" };
    expect(validateImportRow(table.rows[0], table, mapping, "profile-1", [
      { id: "location-1", name: "Home" },
    ]).errors[0].message).toContain("does not match an existing location");
  });
});

describe("historical import duplicate handling", () => {
  it("detects exact database and within-file duplicates without overwriting", () => {
    const first = makePreviewRow(2, 54.2);
    const repeated = makePreviewRow(3, 54.2);
    const other = makePreviewRow(4, 53.8);
    const existing = [{ ...first.payload!, entry_method: "manual" }];
    const classified = classifyImportDuplicates([first, repeated, other], existing);

    expect(classified.map((row) => row.status)).toEqual(["duplicate", "duplicate", "valid"]);
    expect(classified[0].duplicateOf).toBe("an existing measurement");
    expect(classified[1].duplicateOf).toBe("row 2");
    expect(importFingerprint(first.payload!)).toBe(importFingerprint(existing[0]));
    expect(summarizeImportRows(classified)).toMatchObject({
      totalRows: 3,
      validCount: 1,
      duplicateCount: 2,
      invalidCount: 0,
    });
  });
});