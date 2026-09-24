"use server";

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