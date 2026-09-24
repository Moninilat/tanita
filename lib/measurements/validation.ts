const positiveFields = [
  "weight_kg",
  "bmr_kcal",
  "bone_mass_kg",
  "muscle_mass_kg",
  "heart_rate_bpm",
  "metabolic_age",
  "abdomen_cm",
  "flexed_arm_cm",
  "arm_cm",
  "waist_cm",
  "hip_cm",
  "thigh_cm",
] as const;

const measurementFields = [
  ...positiveFields,
  "visceral_fat_rating",
  "body_fat_pct",
  "muscle_quality_score",
  "physique_rating",
  "body_water_pct",
] as const;

export type MeasurementField = (typeof measurementFields)[number];

export type MeasurementInsert = {
  profile_id: string;
  location_id: string;
  measured_at: string;
  entry_method: "manual";
  notes: string | null;
} & Record<MeasurementField, number | null>;

export type MeasurementFormResult =
  | { ok: true; payload: MeasurementInsert }
  | { ok: false; errors: string[] };

function getText(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function parseOptionalNumber(
  formData: FormData,
  field: MeasurementField,
  errors: string[],
): number | null {
  const value = getText(formData, field);
  if (value === "") {
    return null;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    errors.push(`${field} must be a valid number.`);
    return null;
  }

  return number;
}

function validateNumericRules(
  values: Record<MeasurementField, number | null>,
  errors: string[],
) {
  positiveFields.forEach((field) => {
    const value = values[field];
    if (value !== null && value <= 0) {
      errors.push(`${field} must be greater than zero.`);
    }
  });

  const percentageFields = ["body_fat_pct", "body_water_pct"] as const;
  percentageFields.forEach((field) => {
    const value = values[field];
    if (value !== null && (value < 0 || value > 100)) {
      errors.push(`${field} must be between 0 and 100.`);
    }
  });

  const visceralFat = values.visceral_fat_rating;
  if (visceralFat !== null && (visceralFat < 1 || visceralFat > 59)) {
    errors.push("visceral_fat_rating must be between 1 and 59.");
  }
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const [hours, minutes] = value.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function combineMeasurementDateTime(date: string, time: string): string {
  return `${date}T${time || "12:00"}:00`;
}

export function parseMeasurementForm(formData: FormData): MeasurementFormResult {
  const errors: string[] = [];
  const profileId = getText(formData, "profile_id");
  const locationId = getText(formData, "location_id");
  const date = getText(formData, "measurement_date");
  const time = getText(formData, "measurement_time");

  if (!profileId) {
    errors.push("Select a profile.");
  }
  if (!locationId) {
    errors.push("Select a location.");
  }
  if (!date || !isValidDate(date)) {
    errors.push("Enter a measurement date.");
  }
  if (time && !isValidTime(time)) {
    errors.push("Enter a valid measurement time.");
  }

  const values = Object.fromEntries(
    measurementFields.map((field) => [
      field,
      parseOptionalNumber(formData, field, errors),
    ]),
  ) as Record<MeasurementField, number | null>;

  validateNumericRules(values, errors);

  if (Object.values(values).every((value) => value === null)) {
    errors.push("Enter at least one body measurement.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    payload: {
      ...values,
      profile_id: profileId,
      location_id: locationId,
      measured_at: combineMeasurementDateTime(date, time),
      entry_method: "manual",
      notes: getText(formData, "notes") || null,
    },
  };
}