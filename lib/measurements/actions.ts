"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  parseMeasurementForm,
  type MeasurementFormResult,
} from "./validation";
import type { MeasurementActionState } from "./action-state";

export async function createMeasurement(
  _previousState: MeasurementActionState,
  formData: FormData,
): Promise<MeasurementActionState> {
  const parsed: MeasurementFormResult = parseMeasurementForm(formData);
  if (!parsed.ok) {
    return {
      status: "error",
      message: "Please correct the highlighted form errors.",
      errors: parsed.errors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("measurements").insert(parsed.payload);

  if (error) {
    console.error("Measurement insertion failed", error);
    return {
      status: "error",
      message: "The measurement could not be saved. Please try again.",
      errors: [],
    };
  }

  return {
    status: "success",
    message: "Measurement saved successfully.",
    errors: [],
  };
}

export async function updateMeasurement(
  _previousState: MeasurementActionState,
  formData: FormData,
): Promise<MeasurementActionState> {
  const parsed: MeasurementFormResult = parseMeasurementForm(formData);
  const measurementId = formData.get("measurement_id");

  if (typeof measurementId !== "string" || measurementId.length === 0) {
    return {
      status: "error",
      message: "The measurement could not be updated because it is missing an id.",
      errors: [],
    };
  }

  if (!parsed.ok) {
    return {
      status: "error",
      message: "Please correct the highlighted form errors.",
      errors: parsed.errors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("measurements")
    .update(parsed.payload)
    .eq("id", measurementId);

  if (error) {
    console.error("Measurement update failed", error);
    return {
      status: "error",
      message: "The measurement could not be updated. Please try again.",
      errors: [],
    };
  }

  redirect(`/measurements?profile=${parsed.payload.profile_id}`);
}

export async function deleteMeasurement(formData: FormData): Promise<never> {
  const measurementId = formData.get("measurement_id");

  if (typeof measurementId !== "string" || measurementId.length === 0) {
    throw new Error("Missing measurement id for delete action.");
  }

  const supabase = await createClient();
  const { data: measurement, error: lookupError } = await supabase
    .from("measurements")
    .select("profile_id")
    .eq("id", measurementId)
    .maybeSingle();

  if (lookupError) {
    console.error("Measurement lookup failed before delete", lookupError);
    throw new Error("The measurement could not be deleted. Please try again.");
  }

  const { error } = await supabase.from("measurements").delete().eq("id", measurementId);

  if (error) {
    console.error("Measurement deletion failed", error);
    throw new Error("The measurement could not be deleted. Please try again.");
  }

  redirect(`/measurements?profile=${measurement?.profile_id ?? ""}`);
}