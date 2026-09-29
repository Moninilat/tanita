export type MeasurementLocation = {
  id: string;
  name: string;
};

export type MeasurementHistorySource = {
  id: string;
  measured_at: string;
  location_id?: string | null;
  notes?: string | null;
  entry_method?: string | null;
  weight_kg?: number | null;
  bmr_kcal?: number | null;
  bone_mass_kg?: number | null;
  visceral_fat_rating?: number | null;
  body_fat_pct?: number | null;
  muscle_mass_kg?: number | null;
  muscle_quality_score?: number | null;
  physique_rating?: number | null;
  body_water_pct?: number | null;
  heart_rate_bpm?: number | null;
  metabolic_age?: number | null;
  abdomen_cm?: number | null;
  flexed_arm_cm?: number | null;
  arm_cm?: number | null;
  waist_cm?: number | null;
  hip_cm?: number | null;
  thigh_cm?: number | null;
};

export type MeasurementHistoryDetail = {
  label: string;
  value: string;
};

export type MeasurementHistoryItem = {
  id: string;
  measured_at: string;
  locationName: string;
  notes: string | null;
  entryMethod: string;
  details: MeasurementHistoryDetail[];
};

const METRIC_FIELDS: Array<{ key: keyof MeasurementHistorySource; label: string; unit: string; decimals: number }> = [
  { key: "weight_kg", label: "Weight", unit: "kg", decimals: 1 },
  { key: "bmr_kcal", label: "BMR", unit: "kcal/day", decimals: 0 },
  { key: "bone_mass_kg", label: "Bone mass", unit: "kg", decimals: 1 },
  { key: "visceral_fat_rating", label: "Visceral fat", unit: "rating", decimals: 0 },
  { key: "body_fat_pct", label: "Body fat", unit: "%", decimals: 1 },
  { key: "muscle_mass_kg", label: "Muscle mass", unit: "kg", decimals: 1 },
  { key: "muscle_quality_score", label: "Muscle quality", unit: "score", decimals: 0 },
  { key: "physique_rating", label: "Physique rating", unit: "rating", decimals: 0 },
  { key: "body_water_pct", label: "Body water", unit: "%", decimals: 1 },
  { key: "heart_rate_bpm", label: "Heart rate", unit: "bpm", decimals: 0 },
  { key: "metabolic_age", label: "Metabolic age", unit: "years", decimals: 0 },
  { key: "abdomen_cm", label: "Abdomen", unit: "cm", decimals: 1 },
  { key: "flexed_arm_cm", label: "Flexed arm", unit: "cm", decimals: 1 },
  { key: "arm_cm", label: "Arm", unit: "cm", decimals: 1 },
  { key: "waist_cm", label: "Waist", unit: "cm", decimals: 1 },
  { key: "hip_cm", label: "Hip", unit: "cm", decimals: 1 },
  { key: "thigh_cm", label: "Thigh", unit: "cm", decimals: 1 },
];

export function sortMeasurementHistory<T extends { id: string; measured_at: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((left, right) => {
    const measuredAtDifference = right.measured_at.localeCompare(left.measured_at);
    return measuredAtDifference || right.id.localeCompare(left.id);
  });
}

export function formatMeasurementDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMetricValue(value: number, decimals: number, unit: string): string {
  const formatted = Number(value).toFixed(decimals);
  return `${formatted} ${unit}`;
}

export function buildMeasurementHistory(
  measurements: MeasurementHistorySource[],
  locationsById: Record<string, MeasurementLocation> = {},
): MeasurementHistoryItem[] {
  return sortMeasurementHistory(measurements).map((measurement) => {
    const details: MeasurementHistoryDetail[] = METRIC_FIELDS.flatMap(({ key, label, unit, decimals }) => {
      const rawValue = measurement[key as keyof MeasurementHistorySource] as
        | number
        | null
        | undefined;

      if (rawValue === null || rawValue === undefined || !Number.isFinite(rawValue)) {
        return [];
      }

      return [{ label, value: formatMetricValue(rawValue, decimals, unit) }];
    });

    const locationName = measurement.location_id
      ? locationsById[measurement.location_id]?.name ?? "Unknown location"
      : "Unknown location";

    return {
      id: measurement.id,
      measured_at: measurement.measured_at,
      locationName,
      notes: measurement.notes ?? null,
      entryMethod: measurement.entry_method ?? "manual",
      details,
    };
  });
}
