import { parseMeasurementDateTime } from "./date-time";
import { isBlankImportCell, previewCellValue } from "./parser";
import { parseImportNumber } from "./numeric";
import { validateMeasurementValues } from "../validation";
import {
  importMetricFields,
  type ImportCell,
  type ImportMapping,
  type ImportMeasurement,
  type ImportPreviewRow,
  type ImportRow,
  type ParsedImportFile,
  type RowValidationError,
} from "./types";

export type ImportLocation = { id: string; name: string };

function sourceCell(
  row: ImportRow,
  headers: string[],
  mapping: ImportMapping,
  destination: string,
): ImportCell | undefined {
  const column = Object.entries(mapping.columns)
    .find(([, mappedDestination]) => mappedDestination === destination)?.[0];
  if (!column) return undefined;
  const index = headers.indexOf(column);
  return index < 0 ? undefined : row.cells[index];
}

function normalizedLocation(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function readNotes(cell: ImportCell | undefined): { value: string | null; error?: string } {
  if (!cell || isBlankImportCell(cell)) {
    return cell?.formulaError
      ? { value: null, error: "replace the formula or unsupported cell with a literal note." }
      : { value: null };
  }
  if (cell.value instanceof Date) return { value: cell.value.toISOString() };
  return { value: String(cell.value).trim() || null };
}

function rowError(field: string, message: string): RowValidationError {
  return { field, message };
}

export function validateImportRow(
  row: ImportRow,
  table: ParsedImportFile,
  mapping: ImportMapping,
  profileId: string,
  locations: ImportLocation[],
): ImportPreviewRow {
  const errors: RowValidationError[] = [];
  const dateResult = parseMeasurementDateTime(
    sourceCell(row, table.headers, mapping, "measurement_date"),
    sourceCell(row, table.headers, mapping, "measurement_time"),
    table,
    mapping,
  );

  const previewValues: Record<string, string | null> = {};
  Object.entries(mapping.columns).forEach(([header, destination]) => {
    const cell = row.cells[table.headers.indexOf(header)];
    previewValues[destination] = !cell || cell.value === null
      ? null
      : previewCellValue(cell);
  });

  if (!dateResult.ok) errors.push(rowError("measured_at", dateResult.message));

  const defaultLocation = locations.find((location) => location.id === mapping.defaultLocationId);
  const mappedLocationColumn = Object.values(mapping.columns).includes("location");
  const locationCell = sourceCell(row, table.headers, mapping, "location");
  let location: ImportLocation | undefined;

  if (!mappedLocationColumn) {
    location = defaultLocation;
    if (!location) errors.push(rowError("location", "select an existing default location."));
  } else if (isBlankImportCell(locationCell)) {
    if (locationCell?.formulaError) {
      errors.push(rowError("location", "replace the formula or unsupported cell with a location name."));
    } else if (defaultLocation) {
      location = defaultLocation;
    } else {
      errors.push(rowError("location", "enter a location name or select a default location."));
    }
  } else if (typeof locationCell?.value === "string") {
    const matches = locations.filter(
      (candidate) => normalizedLocation(candidate.name) === normalizedLocation(locationCell.value as string),
    );
    if (matches.length === 1) {
      location = matches[0];
    } else {
      errors.push(rowError(
        "location",
        matches.length === 0
          ? `"${locationCell.value.trim()}" does not match an existing location.`
          : `"${locationCell.value.trim()}" matches more than one location.`,
      ));
    }
  } else {
    errors.push(rowError("location", "enter a location name as text."));
  }

  const numericValues = Object.fromEntries(importMetricFields.map((field) => [field, null])) as
    Record<(typeof importMetricFields)[number], number | null>;

  importMetricFields.forEach((field) => {
    const cell = sourceCell(row, table.headers, mapping, field);
    if (!Object.values(mapping.columns).includes(field)) return;

    const parsed = parseImportNumber(cell, field, mapping.decimalFormat);
    if (!parsed.ok) {
      errors.push(rowError(field, parsed.message));
    } else {
      numericValues[field] = parsed.value;
    }
  });

  validateMeasurementValues(numericValues).forEach(({ field, message }) => {
    errors.push(rowError(field, message));
  });

  if (Object.values(numericValues).every((value) => value === null)) {
    errors.push(rowError("measurements", "enter at least one body measurement."));
  }

  const notesResult = readNotes(sourceCell(row, table.headers, mapping, "notes"));
  if (notesResult.error) errors.push(rowError("notes", notesResult.error));

  const uniqueErrors = errors.filter((error, index) =>
    errors.findIndex((candidate) => candidate.field === error.field && candidate.message === error.message) === index,
  );

  if (!dateResult.ok || !location || uniqueErrors.length > 0) {
    return {
      rowNumber: row.rowNumber,
      status: "invalid",
      measuredAt: dateResult.ok ? dateResult.value : null,
      locationName: location?.name ?? null,
      values: previewValues,
      payload: null,
      errors: uniqueErrors,
      duplicateOf: null,
    };
  }

  const payload: ImportMeasurement = {
    ...numericValues,
    profile_id: profileId,
    location_id: location.id,
    measured_at: dateResult.value,
    entry_method: "import",
    notes: notesResult.value,
  };

  return {
    rowNumber: row.rowNumber,
    status: "valid",
    measuredAt: payload.measured_at,
    locationName: location.name,
    values: previewValues,
    payload,
    errors: [],
    duplicateOf: null,
  };
}