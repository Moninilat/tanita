export const trendMetrics = [
  { field: "weight_kg", label: "Weight", unit: "kg", decimals: 2 },
  { field: "body_fat_pct", label: "Body fat", unit: "%", decimals: 1 },
  { field: "muscle_mass_kg", label: "Muscle mass", unit: "kg", decimals: 2 },
  { field: "waist_cm", label: "Waist", unit: "cm", decimals: 1 },
] as const;

export type TrendMetricField = (typeof trendMetrics)[number]["field"];

export type MeasurementTrendSource = {
  id: string;
  measured_at: string;
} & Partial<Record<TrendMetricField, number | null>>;

export type MeasurementTrendPoint = {
  id: string;
  measured_at: string;
  value: number | null;
};

export type MeasurementTrendSeries = (typeof trendMetrics)[number] & {
  points: MeasurementTrendPoint[];
  hasValues: boolean;
};

export type TrendProfile = { id: string; name: string };

export function resolveTrendProfileId(
  profiles: TrendProfile[],
  requestedProfile: string | undefined,
): string | null {
  if (requestedProfile && profiles.some((profile) => profile.id === requestedProfile)) {
    return requestedProfile;
  }

  return profiles.length === 1 ? profiles[0].id : null;
}

function compareMeasurementChronology(
  left: Pick<MeasurementTrendSource, "id" | "measured_at">,
  right: Pick<MeasurementTrendSource, "id" | "measured_at">,
): number {
  const leftTime = Date.parse(left.measured_at);
  const rightTime = Date.parse(right.measured_at);
  const leftIsValid = Number.isFinite(leftTime);
  const rightIsValid = Number.isFinite(rightTime);

  if (leftIsValid && rightIsValid && leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  if (leftIsValid !== rightIsValid) {
    return leftIsValid ? -1 : 1;
  }

  if (!leftIsValid && left.measured_at !== right.measured_at) {
    return left.measured_at.localeCompare(right.measured_at);
  }

  return left.id.localeCompare(right.id);
}

export function sortMeasurementTrends<T extends Pick<MeasurementTrendSource, "id" | "measured_at">>(
  rows: T[],
): T[] {
  return [...rows].sort(compareMeasurementChronology);
}

export function buildMeasurementTrends(
  rows: MeasurementTrendSource[],
): MeasurementTrendSeries[] {
  const orderedRows = sortMeasurementTrends(rows);

  return trendMetrics.map((metric) => {
    const points = orderedRows.map((row) => {
      const rawValue = row[metric.field];

      return {
        id: row.id,
        measured_at: row.measured_at,
        value: typeof rawValue === "number" && Number.isFinite(rawValue) ? rawValue : null,
      };
    });

    return {
      ...metric,
      points,
      hasValues: points.some((point) => point.value !== null),
    };
  });
}