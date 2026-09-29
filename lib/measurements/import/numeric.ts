import { importMetricFields, type DecimalFormat, type ImportCell, type ImportMetricField } from "./types";

const decimalScales: Record<ImportMetricField, number | null> = {
  weight_kg: 3,
  bmr_kcal: 2,
  bone_mass_kg: 3,
  visceral_fat_rating: 2,
  body_fat_pct: 2,
  muscle_mass_kg: 3,
  muscle_quality_score: null,
  physique_rating: null,
  body_water_pct: 2,
  heart_rate_bpm: null,
  metabolic_age: null,
  abdomen_cm: 2,
  flexed_arm_cm: 2,
  arm_cm: 2,
  waist_cm: 2,
  hip_cm: 2,
  thigh_cm: 2,
};

const maximumValues: Record<ImportMetricField, number> = {
  weight_kg: 9999.999,
  bmr_kcal: 99999.99,
  bone_mass_kg: 999.999,
  visceral_fat_rating: 59,
  body_fat_pct: 100,
  muscle_mass_kg: 9999.999,
  muscle_quality_score: 32767,
  physique_rating: 32767,
  body_water_pct: 100,
  heart_rate_bpm: 2147483647,
  metabolic_age: 2147483647,
  abdomen_cm: 9999.99,
  flexed_arm_cm: 9999.99,
  arm_cm: 9999.99,
  waist_cm: 9999.99,
  hip_cm: 9999.99,
  thigh_cm: 9999.99,
};

export type NumericCellResult =
  | { ok: true; value: number | null }
  | { ok: false; message: string };

function decimalPlaces(value: number): number {
  const [coefficient, exponentText] = value.toString().toLowerCase().split("e");
  const exponent = Number(exponentText ?? 0);
  const fractionalDigits = coefficient.split(".")[1]?.length ?? 0;
  return Math.max(0, fractionalDigits - exponent);
}

export function validateStoredNumber(
  field: ImportMetricField,
  value: number,
): string | null {
  if (!Number.isFinite(value)) return "enter a finite number.";

  const scale = decimalScales[field];
  if (scale === null && !Number.isInteger(value)) {
    return "enter a whole number for this field.";
  }

  if (scale !== null && decimalPlaces(value) > scale) {
    return `use no more than ${scale} decimal places for this field.`;
  }

  if (Math.abs(value) > maximumValues[field]) {
    return "the value exceeds the storage limit for this field.";
  }

  return null;
}

export function parseImportNumber(
  cell: ImportCell | undefined,
  field: ImportMetricField,
  decimalFormat: DecimalFormat,
): NumericCellResult {
  if (!cell) return { ok: true, value: null };
  if (cell.formulaError) return { ok: false, message: "replace this formula or unsupported cell with a literal value." };
  if (cell.value === null || (typeof cell.value === "string" && cell.value.trim() === "")) {
    return { ok: true, value: null };
  }

  let value: number;
  if (typeof cell.value === "number") {
    value = cell.value;
  } else if (typeof cell.value === "string") {
    const text = cell.value.trim();
    const normalized = decimalFormat === "decimal-comma" ? text.replace(",", ".") : text;
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
      return {
        ok: false,
        message: "enter a number using the selected decimal format; grouping separators are not supported.",
      };
    }
    value = Number(normalized);
  } else {
    return { ok: false, message: "enter a numeric cell value." };
  }

  if (!Number.isFinite(value)) return { ok: false, message: "enter a finite number." };
  const precisionError = validateStoredNumber(field, value);
  if (precisionError) return { ok: false, message: precisionError };

  if (!importMetricFields.includes(field)) {
    return { ok: false, message: "this field is not supported for import." };
  }

  return { ok: true, value };
}