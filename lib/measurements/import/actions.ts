"use server";

import { createClient } from "@/lib/supabase/server";
import { classifyImportDuplicates, summarizeImportRows } from "./duplicates";
import { validateImportMapping } from "./mapping";
import { ImportFileError, parseImportFile, previewCellValue } from "./parser";
import { validateImportRow, type ImportLocation } from "./validation";
import {
  importMetricFields,
  type DateFormat,
  type DecimalFormat,
  type ImportActionResult,
  type ImportDestination,
  type ImportInspection,
  type ImportMapping,
  type ImportPreview,
  type ImportResultSummary,
  type ParsedImportFile,
} from "./types";

type ImportRequest = {
  file: File;
  profileId: string;
  mapping: ImportMapping;
  table: ParsedImportFile;
};

type ExistingMeasurement = {
  profile_id: string;
  location_id: string;
  measured_at: string;
  notes: string | null;
} & Record<(typeof importMetricFields)[number], number | null>;

const measurementColumns = [
  "profile_id",
  "location_id",
  "measured_at",
  "notes",
  ...importMetricFields,
].join(", ");

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value && typeof value === "object" &&
    "arrayBuffer" in value && "size" in value && "name" in value,
  );
}

function parseColumns(value: string): Record<string, ImportDestination> | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    return Object.fromEntries(
      Object.entries(parsed).map(([header, destination]) => [header, destination as ImportDestination]),
    );
  } catch {
    return null;
  }
}

async function readImportRequest(formData: FormData): Promise<ImportActionResult<ImportRequest>> {
  const fileValue = formData.get("file");
  if (!isUploadedFile(fileValue)) {
    return { ok: false, message: "Choose a CSV or .xlsx file to continue." };
  }

  const profileId = formText(formData, "profile_id");
  if (!profileId) return { ok: false, message: "Select a target profile." };
  if (formText(formData, "profile_confirmed") !== "yes") {
    return { ok: false, message: "Confirm the target profile before previewing or importing rows." };
  }

  const columns = parseColumns(formText(formData, "columns"));
  if (!columns) return { ok: false, message: "Review the column mapping and try again." };

  const dateFormatValue = formText(formData, "date_format");
  const decimalFormatValue = formText(formData, "decimal_format");
  const mapping: ImportMapping = {
    columns,
    dateFormat: dateFormatValue as DateFormat,
    decimalFormat: decimalFormatValue as DecimalFormat,
    timeZone: formText(formData, "time_zone"),
    defaultLocationId: formText(formData, "default_location_id"),
    worksheet: formText(formData, "worksheet"),
  };

  try {
    const table = await parseImportFile(fileValue, mapping.worksheet || undefined);
    return { ok: true, data: { file: fileValue, profileId, mapping, table } };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof ImportFileError
        ? error.message
        : "The file could not be read. Check the file and try again.",
    };
  }
}

async function loadImportReferences(profileId: string): Promise<
  | { ok: true; locations: ImportLocation[] }
  | { ok: false; message: string }
> {
  const supabase = await createClient();
  const [{ data: profile, error: profileError }, { data: locations, error: locationError }] =
    await Promise.all([
      supabase.from("profiles").select("id").eq("id", profileId).maybeSingle(),
      supabase.from("locations").select("id, name").order("name"),
    ]);

  if (profileError || locationError) {
    console.error("Historical import reference lookup failed", profileError ?? locationError);
    return { ok: false, message: "Profiles or locations could not be verified. No rows were imported." };
  }
  if (!profile) return { ok: false, message: "The selected profile is no longer available." };

  return { ok: true, locations: (locations ?? []) as ImportLocation[] };
}

function requestErrors(request: ImportRequest): string[] {
  return [
    ...request.table.headerErrors,
    ...validateImportMapping(request.table.headers, request.mapping),
  ];
}

async function findExistingMeasurements(
  profileId: string,
  measuredAtValues: string[],
): Promise<{ data: ExistingMeasurement[]; error: boolean }> {
  if (measuredAtValues.length === 0) return { data: [], error: false };

  const orderedDates = [...measuredAtValues].sort();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("measurements")
    .select(measurementColumns)
    .eq("profile_id", profileId)
    .gte("measured_at", orderedDates[0])
    .lte("measured_at", orderedDates[orderedDates.length - 1]);

  if (error) {
    console.error("Historical import duplicate lookup failed", error);
    return { data: [], error: true };
  }

  return { data: (data ?? []) as unknown as ExistingMeasurement[], error: false };
}

function getValidatedRows(request: ImportRequest, locations: ImportLocation[]) {
  return request.table.rows.map((row) =>
    validateImportRow(row, request.table, request.mapping, request.profileId, locations),
  );
}

export async function inspectImportFile(
  formData: FormData,
): Promise<ImportActionResult<ImportInspection>> {
  const fileValue = formData.get("file");
  if (!isUploadedFile(fileValue)) {
    return { ok: false, message: "Choose a CSV or .xlsx file to continue." };
  }

  try {
    const worksheet = formText(formData, "worksheet");
    const table = await parseImportFile(fileValue, worksheet || undefined);
    return {
      ok: true,
      data: {
        fileName: table.fileName,
        headers: table.headers,
        headerErrors: table.headerErrors,
        worksheets: table.worksheets,
        worksheet: table.worksheet,
        date1904: table.date1904,
        sampleRows: table.rows.slice(0, 5).map((row) => ({
          rowNumber: row.rowNumber,
          values: table.headers.map((_, index) => previewCellValue(row.cells[index])),
        })),
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof ImportFileError
        ? error.message
        : "The file could not be read. Check the file and try again.",
    };
  }
}

export async function previewHistoricalImport(
  formData: FormData,
): Promise<ImportActionResult<ImportPreview>> {
  const requestResult = await readImportRequest(formData);
  if (!requestResult.ok) return requestResult;
  const request = requestResult.data;
  const errors = requestErrors(request);
  if (errors.length > 0) {
    return { ok: false, message: "Fix the file headers or column mapping before previewing.", fieldErrors: errors };
  }

  const references = await loadImportReferences(request.profileId);
  if (!references.ok) return references;

  const rows = getValidatedRows(request, references.locations);
  const validRows = rows.filter((row) => row.status === "valid" && row.payload);
  const existing = await findExistingMeasurements(
    request.profileId,
    validRows.map((row) => row.payload!.measured_at),
  );
  if (existing.error) {
    return { ok: false, message: "Duplicate status could not be checked. No rows were imported." };
  }

  const classified = classifyImportDuplicates(rows, existing.data);
  return {
    ok: true,
    data: {
      ...summarizeImportRows(classified),
      unmappedHeaders: request.table.headers.filter((header) => !(header in request.mapping.columns)),
    },
  };
}

function readNumberArray(formData: FormData, key: string): number[] | null {
  try {
    const value: unknown = JSON.parse(formText(formData, key));
    if (!Array.isArray(value) || value.some((item) => !Number.isInteger(item) || item < 1)) return null;
    return [...new Set(value as number[])];
  } catch {
    return null;
  }
}

export async function commitHistoricalImport(
  formData: FormData,
): Promise<ImportActionResult<ImportResultSummary>> {
  const requestResult = await readImportRequest(formData);
  if (!requestResult.ok) return requestResult;
  const request = requestResult.data;
  const errors = requestErrors(request);
  if (errors.length > 0) {
    return { ok: false, message: "The preview settings are no longer valid. Review the mapping and preview again.", fieldErrors: errors };
  }

  const selectedRows = readNumberArray(formData, "selected_rows");
  const duplicateOverrides = readNumberArray(formData, "duplicate_overrides");
  if (!selectedRows || !duplicateOverrides) {
    return { ok: false, message: "The selected import rows could not be verified. Preview the file again." };
  }
  if (duplicateOverrides.some((rowNumber) => !selectedRows.includes(rowNumber))) {
    return { ok: false, message: "A duplicate override must be selected for import." };
  }
  if (duplicateOverrides.length > 0 && formText(formData, "duplicates_confirmed") !== "yes") {
    return { ok: false, message: "Confirm the duplicate warning before importing duplicate rows." };
  }

  const references = await loadImportReferences(request.profileId);
  if (!references.ok) return references;

  const rows = getValidatedRows(request, references.locations);
  const validRows = rows.filter((row) => row.status === "valid" && row.payload);
  const existing = await findExistingMeasurements(
    request.profileId,
    validRows.map((row) => row.payload!.measured_at),
  );
  if (existing.error) {
    return { ok: false, message: "Duplicate status could not be checked. No rows were imported." };
  }

  const classified = classifyImportDuplicates(rows, existing.data);
  const rowsByNumber = new Map(classified.map((row) => [row.rowNumber, row]));
  if (selectedRows.some((rowNumber) => !rowsByNumber.has(rowNumber))) {
    return { ok: false, message: "The file rows changed after preview. Generate a new preview before importing." };
  }

  const selected = new Set(selectedRows);
  const overrides = new Set(duplicateOverrides);
  const rowsToInsert = classified.filter((row) => {
    if (!selected.has(row.rowNumber) || !row.payload) return false;
    return row.status !== "duplicate" || overrides.has(row.rowNumber);
  });
  const invalidSkippedCount = classified.filter((row) => row.status === "invalid").length;
  const duplicateSkippedCount = classified.filter(
    (row) => row.status === "duplicate" && !overrides.has(row.rowNumber),
  ).length;
  const deselectedCount = classified.filter(
    (row) => row.status === "valid" && !selected.has(row.rowNumber),
  ).length;

  if (rowsToInsert.length === 0) {
    return {
      ok: true,
      data: {
        insertedCount: 0,
        invalidSkippedCount,
        duplicateSkippedCount,
        deselectedCount,
        duplicateOverrideCount: 0,
      },
    };
  }

  const payloads = rowsToInsert.map((row) => ({
    ...row.payload!,
    entry_method: "import" as const,
  }));
  const supabase = await createClient();
  const { error: insertError } = await supabase.from("measurements").insert(payloads);
  if (insertError) {
    console.error("Historical measurement import insertion failed", insertError);
    return { ok: false, message: "The selected rows could not be imported. No rows from this batch were added; the preview is still available for retry." };
  }

  return {
    ok: true,
    data: {
      insertedCount: payloads.length,
      invalidSkippedCount,
      duplicateSkippedCount,
      deselectedCount,
      duplicateOverrideCount: rowsToInsert.filter((row) => overrides.has(row.rowNumber)).length,
    },
  };
}