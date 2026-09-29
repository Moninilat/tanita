import Link from "next/link";
import ImportWizard from "@/components/measurements/import/import-wizard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ profile?: string | string[] }>;

export default async function MeasurementImportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const [{ data: profiles, error: profilesError }, { data: locations, error: locationsError }, params] =
    await Promise.all([
      supabase.from("profiles").select("id, name").order("name"),
      supabase.from("locations").select("id, name").order("name"),
      searchParams,
    ]);

  if (profilesError || locationsError) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-6 py-12">
        <h1 className="text-3xl font-semibold">Import historical measurements</h1>
        <p role="alert">Profiles and locations could not be loaded. No measurements can be imported.</p>
        <Link className="font-medium underline" href="/measurements">Back to measurement history</Link>
      </main>
    );
  }

  const availableProfiles = profiles ?? [];
  const availableLocations = locations ?? [];
  const requestedProfile = typeof params.profile === "string" ? params.profile : "";
  const initialProfileId = availableProfiles.some((profile) => profile.id === requestedProfile)
    ? requestedProfile
    : availableProfiles.length === 1
      ? availableProfiles[0].id
      : "";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-5 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Data entry</p>
          <h1 className="mt-2 text-3xl font-semibold">Import historical measurements</h1>
          <p className="mt-2 max-w-2xl text-zinc-600">
            Map a CSV or Excel file, review every row, then import only selected valid measurements.
          </p>
        </div>
        <nav aria-label="Measurement navigation" className="flex flex-col gap-2 sm:flex-row">
          <Link className="rounded border border-zinc-300 px-4 py-2.5 text-center font-medium text-zinc-700" href="/measurements">
            Measurement history
          </Link>
          <Link className="rounded bg-black px-4 py-2.5 text-center font-medium text-white" href="/">
            Dashboard
          </Link>
        </nav>
      </header>

      {availableProfiles.length === 0 || availableLocations.length === 0 ? (
        <section className="rounded border border-dashed border-zinc-300 p-8">
          <h2 className="text-xl font-semibold">
            {availableProfiles.length === 0 ? "No profiles available." : "No locations available."}
          </h2>
          <p className="mt-2 text-zinc-600">
            {availableProfiles.length === 0
              ? "An existing profile is required before importing measurements."
              : "Every measurement needs an existing location before it can be imported."}
          </p>
        </section>
      ) : (
        <ImportWizard
          initialProfileId={initialProfileId}
          locations={availableLocations}
          profiles={availableProfiles}
        />
      )}
    </main>
  );
}
