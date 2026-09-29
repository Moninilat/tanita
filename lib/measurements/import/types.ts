import type { MeasurementField, MeasurementInsert } from "../validation";

export const importMetricFields = [
  "weight_kg",
  "bmr_kcal",
  "bone_mass_kg",
  "visceral_fat_rating",
  "body_fat_pct",
  "muscle_mass_kg",
  "muscle_quality_score",
  "physique_rating",
  "body_water_pct",
  "heart_rate_bpm",
  "metabolic_age",
  "abdomen_cm",
  "flexed_arm_cm",
  "arm_cm",
  "waist_cm",
  "hip_cm",
  "thigh_cm",
] as const satisfies readonly MeasurementField[];

export type ImportMetricField = (typeof importMetricFields)[number];
export type ImportDestination =
  | "measurement_date"
  | "measurement_time"
  | "location"
  | "notes"
  | ImportMetricField;

export type DateFormat = "auto" | "month-first" | "day-first";
export type DecimalFormat = "decimal-point" | "decimal-comma";

export type ImportMapping = {
  columns: Record<string, ImportDestination>;
  dateFormat: DateFormat;
  decimalFormat: DecimalFormat;
  timeZone: string;
  defaultLocationId: string;
  worksheet: string;
};

export type ImportCellValue = string | number | Date | null;

export type ImportCell = {
  value: ImportCellValue;
  isFormula?: boolean;
  formulaError?: boolean;
  dateHasTime?: boolean;
};

export type ImportRow = {
  rowNumber: number;
  cells: ImportCell[];
};

export type ParsedImportFile = {
  fileName: string;
  headers: string[];
  rows: ImportRow[];
  headerErrors: string[];
  worksheets: string[];
  worksheet: string;
  date1904: boolean;
};

export type ImportMeasurement = Omit<MeasurementInsert, "entry_method"> & {
  entry_method: "import";
};

export type RowValidationError = {
  field: string;
  message: string;
};

export type ImportPreviewRow = {
  rowNumber: number;
  status: "valid" | "invalid" | "duplicate";
  measuredAt: string | null;
  locationName: string | null;
  values: Record<string, string | null>;
  payload: ImportMeasurement | null;
  errors: RowValidationError[];
  duplicateOf: string | null;
};

export type ImportPreview = {
  rows: ImportPreviewRow[];
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  unmappedHeaders: string[];
};

export type ImportInspection = {
  fileName: string;
  headers: string[];
  headerErrors: string[];
  worksheets: string[];
  worksheet: string;
  sampleRows: Array<{ rowNumber: number; values: string[] }>;
  date1904: boolean;
};

export type ImportResultSummary = {
  insertedCount: number;
  invalidSkippedCount: number;
  duplicateSkippedCount: number;
  deselectedCount: number;
  duplicateOverrideCount: number;
};

export type ImportActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: string[] };
