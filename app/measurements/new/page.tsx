import { createClient } from "@/lib/supabase/server";
import MeasurementForm from "./measurement-form";

export const dynamic = "force-dynamic";

export default async function NewMeasurementPage() {
  const supabase = await createClient();
  const [{ data: profiles, error: profilesError }, { data: locations, error: locationsError }] =
    await Promise.all([
      supabase.from("profiles").select("id, name").order("name"),
      supabase.from("locations").select("id, name").order("name"),
    ]);

  if (profilesError || locationsError) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold">New measurement</h1>
        <p role="alert">Profiles and locations could not be loaded.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-3xl font-semibold">New measurement</h1>
        <p className="mt-2 text-zinc-600">Record an available Tanita or body measurement.</p>
      </div>
      <MeasurementForm profiles={profiles} locations={locations} />
    </main>
  );
}