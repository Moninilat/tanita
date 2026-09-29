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

export type MeasurementValueError = {
  field: MeasurementField;
  message: string;
};

export function validateMeasurementValues(
  values: Partial<Record<MeasurementField, number | null>>,
): MeasurementValueError[] {
  const errors: MeasurementValueError[] = [];

  positiveFields.forEach((field) => {
    const value = values[field];
    if (value != null && value <= 0) {
      errors.push({ field, message: `${field} must be greater than zero.` });
    }
  });

  const percentageFields = ["body_fat_pct", "body_water_pct"] as const;
  percentageFields.forEach((field) => {
    const value = values[field];
    if (value != null && (value < 0 || value > 100)) {
      errors.push({ field, message: `${field} must be between 0 and 100.` });
    }
  });

  const visceralFat = values.visceral_fat_rating;
  if (visceralFat != null && (visceralFat < 1 || visceralFat > 59)) {
    errors.push({
      field: "visceral_fat_rating",
      message: "visceral_fat_rating must be between 1 and 59.",
    });
  }

  return errors;
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

export function buildMeasurementFormDefaults(
  measurement: {
    profile_id?: string | null;
    location_id?: string | null;
    measured_at?: string | null;
    notes?: string | null;
  } & Partial<Record<MeasurementField, number | null>>,
): Record<string, string | number | null> {
  const defaults: Record<string, string | number | null> = {
    profile_id: measurement.profile_id ?? "",
    location_id: measurement.location_id ?? "",
    measurement_date: "",
    measurement_time: "",
    notes: measurement.notes ?? "",
  };

  if (measurement.measured_at) {
    const timestamp = new Date(measurement.measured_at);
    if (!Number.isNaN(timestamp.getTime())) {
      const year = timestamp.getFullYear();
      const month = String(timestamp.getMonth() + 1).padStart(2, "0");
      const day = String(timestamp.getDate()).padStart(2, "0");
      const hours = String(timestamp.getHours()).padStart(2, "0");
      const minutes = String(timestamp.getMinutes()).padStart(2, "0");
      defaults.measurement_date = `${year}-${month}-${day}`;
      defaults.measurement_time = `${hours}:${minutes}`;
    }
  }

  measurementFields.forEach((field) => {
    defaults[field] = measurement[field] ?? "";
  });

  return defaults;
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

  errors.push(...validateMeasurementValues(values).map((error) => error.message));

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