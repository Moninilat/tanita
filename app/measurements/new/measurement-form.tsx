"use client";

import { useActionState } from "react";
import {
  createMeasurement,
  deleteMeasurement,
  updateMeasurement,
} from "@/lib/measurements/actions";
import { initialMeasurementActionState } from "@/lib/measurements/action-state";

type SelectorOption = { id: string; name: string };

type MeasurementFormProps = {
  profiles: SelectorOption[];
  locations: SelectorOption[];
  mode?: "create" | "edit";
  measurementId?: string;
  initialValues?: Partial<{
    profile_id: string;
    location_id: string;
    measurement_date: string;
    measurement_time: string;
    notes: string;
    weight_kg: number | string | null;
    bmr_kcal: number | string | null;
    bone_mass_kg: number | string | null;
    visceral_fat_rating: number | string | null;
    body_fat_pct: number | string | null;
    muscle_mass_kg: number | string | null;
    muscle_quality_score: number | string | null;
    physique_rating: number | string | null;
    body_water_pct: number | string | null;
    heart_rate_bpm: number | string | null;
    metabolic_age: number | string | null;
    abdomen_cm: number | string | null;
    flexed_arm_cm: number | string | null;
    arm_cm: number | string | null;
    waist_cm: number | string | null;
    hip_cm: number | string | null;
    thigh_cm: number | string | null;
  }>;
  submitLabel?: string;
};

const tanitaFields = [
  ["weight_kg", "Weight", "kg"],
  ["bmr_kcal", "Basal metabolic rate", "kcal/day"],
  ["bone_mass_kg", "Bone mass", "kg"],
  ["visceral_fat_rating", "Visceral fat", "rating"],
  ["body_fat_pct", "Body fat", "%"],
  ["muscle_mass_kg", "Muscle mass", "kg"],
  ["muscle_quality_score", "Muscle quality", "score"],
  ["physique_rating", "Physique rating", "rating"],
  ["body_water_pct", "Body water", "%"],
  ["heart_rate_bpm", "Heart rate", "bpm"],
  ["metabolic_age", "Metabolic age", "years"],
] as const;

const circumferenceFields = [
  ["abdomen_cm", "Abdomen"],
  ["flexed_arm_cm", "Flexed arm"],
  ["arm_cm", "Arm"],
  ["waist_cm", "Waist"],
  ["hip_cm", "Hip"],
  ["thigh_cm", "Thigh"],
] as const;

function formatInputDefault(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

function NumericField({
  name,
  label,
  unit,
  defaultValue,
}: {
  name: string;
  label: string;
  unit: string;
  defaultValue?: number | string | null;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-medium">{label}</span>
      <span className="flex items-center gap-2">
        <input
          className="min-w-0 flex-1 rounded border border-zinc-300 px-3 py-2"
          defaultValue={formatInputDefault(defaultValue)}
          name={name}
          type="number"
          step="any"
          inputMode="decimal"
        />
        <span className="w-16 text-sm text-zinc-500">{unit}</span>
      </span>
    </label>
  );
}

export default function MeasurementForm({
  profiles,
  locations,
  mode = "create",
  measurementId,
  initialValues,
  submitLabel = "Save measurement",
}: MeasurementFormProps) {
  const action = mode === "edit" ? updateMeasurement : createMeasurement;
  const [state, formAction, pending] = useActionState(
    action,
    initialMeasurementActionState,
  );
  const status = state?.status ?? "idle";
  const message = state?.message ?? "";
  const errors = state?.errors ?? [];

  return (
    <>
      <form action={formAction} className="flex flex-col gap-8" noValidate={false}>
        {measurementId && (
          <input name="measurement_id" type="hidden" value={measurementId} />
        )}

        {status !== "idle" && (
          <p
            aria-live="polite"
            className={status === "success" ? "rounded border border-green-300 bg-green-50 p-3" : "rounded border border-red-300 bg-red-50 p-3"}
            role={status === "error" ? "alert" : "status"}
          >
            {message}
          </p>
        )}

        {errors.length > 0 && (
          <ul aria-label="Form errors" className="list-disc rounded border border-red-300 bg-red-50 p-4 pl-8 text-red-800">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        )}

        <fieldset className="grid gap-4 rounded border p-5 sm:grid-cols-2">
          <legend className="px-2 text-lg font-semibold">Measurement details</legend>
          <label className="flex flex-col gap-1">
            <span className="font-medium">Profile</span>
            <select
              className="rounded border border-zinc-300 px-3 py-2"
              defaultValue={initialValues?.profile_id ?? ""}
              name="profile_id"
              required
            >
              <option value="" disabled>Select a profile</option>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium">Location</span>
            <select
              className="rounded border border-zinc-300 px-3 py-2"
              defaultValue={initialValues?.location_id ?? ""}
              name="location_id"
              required
            >
              <option value="" disabled>Select a location</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium">Measurement date</span>
            <input
              className="rounded border border-zinc-300 px-3 py-2"
              defaultValue={initialValues?.measurement_date ?? ""}
              name="measurement_date"
              type="date"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium">Measurement time <span className="font-normal text-zinc-500">(optional)</span></span>
            <input
              className="rounded border border-zinc-300 px-3 py-2"
              defaultValue={initialValues?.measurement_time ?? ""}
              name="measurement_time"
              type="time"
            />
          </label>
        </fieldset>

        <fieldset className="grid gap-4 rounded border p-5 sm:grid-cols-2">
          <legend className="px-2 text-lg font-semibold">Tanita measurements</legend>
          {tanitaFields.map(([name, label, unit]) => (
            <NumericField
              key={name}
              defaultValue={initialValues?.[name]}
              label={label}
              name={name}
              unit={unit}
            />
          ))}
        </fieldset>

        <fieldset className="grid gap-4 rounded border p-5 sm:grid-cols-2">
          <legend className="px-2 text-lg font-semibold">Body circumferences</legend>
          {circumferenceFields.map(([name, label]) => (
            <NumericField
              key={name}
              defaultValue={initialValues?.[name]}
              label={label}
              name={name}
              unit="cm"
            />
          ))}
        </fieldset>

        <label className="flex flex-col gap-1">
          <span className="font-medium">Notes <span className="font-normal text-zinc-500">(optional)</span></span>
          <textarea
            className="min-h-28 rounded border border-zinc-300 px-3 py-2"
            defaultValue={initialValues?.notes ?? ""}
            name="notes"
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button className="rounded bg-black px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={pending}>
            {pending ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>

      {mode === "edit" && measurementId && (
        <form
          action={deleteMeasurement}
          className="mt-4"
          onSubmit={(event) => {
            if (!window.confirm("Delete this measurement? This cannot be undone.")) {
              event.preventDefault();
            }
          }}
        >
          <input name="measurement_id" type="hidden" value={measurementId} />
          <button
            className="rounded border border-red-300 bg-red-50 px-4 py-3 font-medium text-red-700"
            type="submit"
          >
            Delete measurement
          </button>
        </form>
      )}
    </>
  );
}