import Link from "next/link";
import { notFound } from "next/navigation";
import SignOutButton from "@/components/auth/sign-out-button";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { buildMeasurementFormDefaults } from "@/lib/measurements/validation";
import MeasurementForm from "@/app/measurements/new/measurement-form";

export const dynamic = "force-dynamic";

type EditMeasurementPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditMeasurementPage({ params }: EditMeasurementPageProps) {
  const { id } = await params;
  const { supabase } = await requireAuthenticatedUser();

  const [
    { data: profiles, error: profilesError },
    { data: locations, error: locationsError },
    { data: measurement, error: measurementError },
  ] = await Promise.all([
    supabase.from("profiles").select("id, name").order("name"),
    supabase.from("locations").select("id, name").order("name"),
    supabase
      .from("measurements")
      .select(
        "id, profile_id, location_id, measured_at, notes, entry_method, weight_kg, bmr_kcal, bone_mass_kg, visceral_fat_rating, body_fat_pct, muscle_mass_kg, muscle_quality_score, physique_rating, body_water_pct, heart_rate_bpm, metabolic_age, abdomen_cm, flexed_arm_cm, arm_cm, waist_cm, hip_cm, thigh_cm",
      )
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (profilesError || locationsError) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold">Edit measurement</h1>
        <p role="alert">This measurement could not be loaded.</p>
        <Link className="text-sm font-medium text-zinc-700 underline" href="/measurements">
          Back to measurement history
        </Link>
      </main>
    );
  }

  if (measurementError || !measurement) notFound();

  const selectedProfileExists = profiles?.some((profile) => profile.id === measurement.profile_id) ?? false;
  if (!selectedProfileExists) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold">Edit measurement</h1>
        <p role="alert">This measurement belongs to an unavailable profile.</p>
        <Link className="text-sm font-medium text-zinc-700 underline" href="/measurements">
          Back to measurement history
        </Link>
      </main>
    );
  }

  const initialValues = buildMeasurementFormDefaults(measurement);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Edit</p>
          <h1 className="mt-2 text-3xl font-semibold">Edit measurement</h1>
        </div>
        <Link
          className="rounded border border-zinc-300 px-4 py-2.5 text-center font-medium text-zinc-700"
          href={`/measurements?profile=${measurement.profile_id}`}
        >
          Back to history
        </Link>
        <SignOutButton />
      </div>

      <MeasurementForm
        initialValues={initialValues}
        locations={locations ?? []}
        measurementId={measurement.id}
        mode="edit"
        profiles={profiles ?? []}
        submitLabel="Save changes"
      />
    </main>
  );
}
