import { importMetricFields, type ImportMeasurement, type ImportPreviewRow } from "./types";

type DuplicateSource = Omit<ImportMeasurement, "entry_method"> & {
  entry_method?: string;
};

function normalizeTimestamp(value: string): string {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? value : timestamp.toISOString();
}

function normalizeNotes(value: string | null): string | null {
  const normalized = value?.replace(/\r\n?/g, "\n").trim() ?? "";
  return normalized || null;
}

export function importFingerprint(payload: DuplicateSource): string {
  return JSON.stringify([
    payload.profile_id,
    payload.location_id,
    normalizeTimestamp(payload.measured_at),
    ...importMetricFields.map((field) => payload[field] ?? null),
    normalizeNotes(payload.notes),
  ]);
}

export function classifyImportDuplicates(
  rows: ImportPreviewRow[],
  existing: DuplicateSource[],
): ImportPreviewRow[] {
  const existingFingerprints = new Set(existing.map(importFingerprint));
  const firstFileRow = new Map<string, number>();

  return rows.map((row) => {
    if (row.status !== "valid" || !row.payload) return row;

    const fingerprint = importFingerprint(row.payload);
    const firstRowNumber = firstFileRow.get(fingerprint);
    if (firstRowNumber !== undefined) {
      return {
        ...row,
        status: "duplicate",
        duplicateOf: `row ${firstRowNumber}`,
      };
    }
    firstFileRow.set(fingerprint, row.rowNumber);

    if (existingFingerprints.has(fingerprint)) {
      return {
        ...row,
        status: "duplicate",
        duplicateOf: "an existing measurement",
      };
    }

    return row;
  });
}

export function summarizeImportRows(rows: ImportPreviewRow[]) {
  const validCount = rows.filter((row) => row.status === "valid").length;
  const invalidCount = rows.filter((row) => row.status === "invalid").length;
  const duplicateCount = rows.filter((row) => row.status === "duplicate").length;

  return {
    rows,
    totalRows: rows.length,
    validCount,
    invalidCount,
    duplicateCount,
  };
}