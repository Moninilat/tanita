"use server";

import { notFound, redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import {
  parseMeasurementForm,
  type MeasurementFormResult,
} from "./validation";
import type { MeasurementActionState } from "./action-state";

export async function createMeasurement(
  _previousState: MeasurementActionState,
  formData: FormData,
): Promise<MeasurementActionState> {
  const { supabase } = await requireAuthenticatedUser();
  const parsed: MeasurementFormResult = parseMeasurementForm(formData);
  if (!parsed.ok) {
    return {
      status: "error",
      message: "Please correct the highlighted form errors.",
      errors: parsed.errors,
    };
  }

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
  const { supabase } = await requireAuthenticatedUser();
  const parsed: MeasurementFormResult = parseMeasurementForm(formData);
  const measurementId = formData.get("measurement_id");

  if (typeof measurementId !== "string" || measurementId.length === 0) {
    notFound();
  }
  if (!isUuid(measurementId)) notFound();

  if (!parsed.ok) {
    return {
      status: "error",
      message: "Please correct the highlighted form errors.",
      errors: parsed.errors,
    };
  }

  const { data: updatedMeasurement, error } = await supabase
    .from("measurements")
    .update(parsed.payload)
    .eq("id", measurementId)
    .select("id")
    .maybeSingle();

  if (error || !updatedMeasurement) {
    if (!updatedMeasurement && !error) notFound();
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
  const { supabase } = await requireAuthenticatedUser();
  const measurementId = formData.get("measurement_id");

  if (typeof measurementId !== "string" || measurementId.length === 0) {
    notFound();
  }
  if (!isUuid(measurementId)) notFound();

  const { data: measurement, error: lookupError } = await supabase
    .from("measurements")
    .select("profile_id")
    .eq("id", measurementId)
    .maybeSingle();

  if (lookupError || !measurement) {
    if (!measurement && !lookupError) notFound();
    console.error("Measurement lookup failed before delete", lookupError);
    throw new Error("The measurement could not be deleted. Please try again.");
  }

  const { data: deletedMeasurement, error } = await supabase
    .from("measurements")
    .delete()
    .eq("id", measurementId)
    .select("id")
    .maybeSingle();

  if (error || !deletedMeasurement) {
    if (!deletedMeasurement && !error) notFound();
    console.error("Measurement deletion failed", error);
    throw new Error("The measurement could not be deleted. Please try again.");
  }

  redirect(`/measurements?profile=${measurement?.profile_id ?? ""}`);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}