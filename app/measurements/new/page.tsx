import SignOutButton from "@/components/auth/sign-out-button";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import MeasurementForm from "./measurement-form";

export const dynamic = "force-dynamic";

export default async function NewMeasurementPage() {
  const { supabase } = await requireAuthenticatedUser();
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
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">New measurement</h1>
          <p className="mt-2 text-zinc-600">Record an available Tanita or body measurement.</p>
        </div>
        <SignOutButton />
      </header>
      <MeasurementForm profiles={profiles} locations={locations} />
    </main>
  );
}