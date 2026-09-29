import {
  importMetricFields,
  type ImportDestination,
  type ImportMapping,
} from "./types";

const destinations: ImportDestination[] = [
  "measurement_date",
  "measurement_time",
  "location",
  "notes",
  ...importMetricFields,
];

const aliases: Record<string, ImportDestination> = {
  date: "measurement_date",
  measurement_date: "measurement_date",
  measured_at: "measurement_date",
  timestamp: "measurement_date",
  measurement_time: "measurement_time",
  time: "measurement_time",
  location: "location",
  location_name: "location",
  notes: "notes",
  note: "notes",
  weight: "weight_kg",
  weight_kg: "weight_kg",
  body_fat: "body_fat_pct",
  body_fat_percent: "body_fat_pct",
  body_fat_pct: "body_fat_pct",
  muscle_mass: "muscle_mass_kg",
  muscle_mass_kg: "muscle_mass_kg",
  waist: "waist_cm",
  waist_cm: "waist_cm",
};

export function normalizeImportHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[%]/g, "pct")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function suggestImportMapping(headers: string[]): Record<string, ImportDestination> {
  const suggestions: Record<string, ImportDestination> = {};

  headers.forEach((header) => {
    const normalized = normalizeImportHeader(header);
    const destination = aliases[normalized] ??
      (destinations.includes(normalized as ImportDestination)
        ? normalized as ImportDestination
        : undefined);

    if (destination && !Object.values(suggestions).includes(destination)) {
      suggestions[header] = destination;
    }
  });

  return suggestions;
}

export function validateImportMapping(
  headers: string[],
  mapping: ImportMapping,
): string[] {
  const errors: string[] = [];
  const usedDestinations: ImportDestination[] = [];

  Object.entries(mapping.columns).forEach(([header, destination]) => {
    if (!headers.includes(header)) {
      errors.push(`Mapped column "${header}" is not present in the selected worksheet.`);
      return;
    }

    if (!destinations.includes(destination)) {
      errors.push(`Unsupported destination for column "${header}".`);
      return;
    }

    if (usedDestinations.includes(destination)) {
      errors.push(`Only one source column may map to ${destination}.`);
    } else {
      usedDestinations.push(destination);
    }
  });

  if (!usedDestinations.includes("measurement_date")) {
    errors.push("Map a source column to the measurement date.");
  }

  if (!importMetricFields.some((field) => usedDestinations.includes(field))) {
    errors.push("Map at least one measurement metric.");
  }

  if (!mapping.timeZone || !isValidTimeZone(mapping.timeZone)) {
    errors.push("Choose a valid timezone for dates without an offset.");
  }

  if (mapping.dateFormat !== "auto" && mapping.dateFormat !== "month-first" && mapping.dateFormat !== "day-first") {
    errors.push("Choose a supported date format.");
  }

  if (mapping.decimalFormat !== "decimal-point" && mapping.decimalFormat !== "decimal-comma") {
    errors.push("Choose a supported decimal format.");
  }

  return errors;
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}