import Link from "next/link";
import MeasurementTrends from "@/components/measurements/measurement-trends";
import {
  buildMeasurementTrends,
  resolveTrendProfileId,
} from "@/lib/measurements/trends";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ profile?: string | string[] }>;

function historyHref(profileId: string | null): string {
  return profileId
    ? `/measurements?profile=${encodeURIComponent(profileId)}`
    : "/measurements";
}

export default async function MeasurementTrendsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const [{ data: profiles, error: profilesError }, params] = await Promise.all([
    supabase.from("profiles").select("id, name").order("name"),
    searchParams,
  ]);

  if (profilesError) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-6 py-12">
        <h1 className="text-3xl font-semibold">Measurement trends</h1>
        <p role="alert">Profiles could not be loaded. Please try again.</p>
        <Link className="font-medium text-zinc-700 underline" href="/measurements">
          Back to measurement history
        </Link>
      </main>
    );
  }

  const availableProfiles = profiles ?? [];
  const requestedProfile = typeof params.profile === "string" ? params.profile : undefined;
  const profileId = resolveTrendProfileId(availableProfiles, requestedProfile);
  const selectedProfile = availableProfiles.find((profile) => profile.id === profileId);
  const historyUrl = historyHref(profileId);

  const { data: measurements, error: measurementsError } = profileId
    ? await supabase
        .from("measurements")
        .select("id, measured_at, weight_kg, body_fat_pct, muscle_mass_kg, waist_cm")
        .eq("profile_id", profileId)
        .order("measured_at", { ascending: true })
        .order("id", { ascending: true })
    : { data: [], error: null };

  if (measurementsError) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-6 py-12">
        <h1 className="text-3xl font-semibold">Measurement trends</h1>
        <p role="alert">Historical measurements could not be loaded.</p>
        <Link className="font-medium text-zinc-700 underline" href={historyUrl}>
          Back to measurement history
        </Link>
      </main>
    );
  }

  const hasNoHistory = profileId !== null && (measurements?.length ?? 0) === 0;
  const series = buildMeasurementTrends(measurements ?? []);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-5 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">History</p>
          <h1 className="mt-2 text-3xl font-semibold">Measurement trends</h1>
          {selectedProfile && <p className="mt-2 text-zinc-600">{selectedProfile.name}</p>}
        </div>
        <nav aria-label="Measurement navigation" className="flex flex-col gap-2 sm:flex-row">
          <Link
            className="rounded border border-zinc-300 px-4 py-2.5 text-center font-medium text-zinc-700"
            href={historyUrl}
          >
            Measurement history
          </Link>
          <Link
            className="rounded bg-black px-4 py-2.5 text-center font-medium text-white"
            href="/"
          >
            Dashboard
          </Link>
        </nav>
      </header>

      {availableProfiles.length > 1 && (
        <form action="/measurements/trends" className="flex flex-col gap-2 sm:max-w-xs" method="get">
          <label className="font-medium" htmlFor="profile">Profile</label>
          <select
            className="rounded border border-zinc-300 bg-white px-3 py-2"
            defaultValue={profileId ?? ""}
            id="profile"
            name="profile"
          >
            <option value="">Select a profile</option>
            {availableProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.name}</option>
            ))}
          </select>
          <button
            className="self-start rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700"
            type="submit"
          >
            View trends
          </button>
        </form>
      )}

      {availableProfiles.length === 0 ? (
        <section className="rounded border border-dashed border-zinc-300 p-8">
          <h2 className="text-xl font-semibold">No profiles yet.</h2>
          <p className="mt-2 text-zinc-600">A profile is needed before measurement trends can be shown.</p>
        </section>
      ) : !profileId ? (
        <section className="rounded border border-dashed border-zinc-300 p-8">
          <h2 className="text-xl font-semibold">Choose a profile to view trends.</h2>
          <p className="mt-2 text-zinc-600">Select a profile above to load its measurement history.</p>
        </section>
      ) : hasNoHistory ? (
        <section className="rounded border border-dashed border-zinc-300 p-8">
          <h2 className="text-xl font-semibold">No measurements recorded.</h2>
          <p className="mt-2 text-zinc-600">
            {selectedProfile ? `No history is available for ${selectedProfile.name}.` : "This profile has no measurement history."}
          </p>
          <Link className="mt-4 inline-block font-medium text-zinc-700 underline" href={historyUrl}>
            View measurement history
          </Link>
        </section>
      ) : (
        <MeasurementTrends series={series} />
      )}
    </main>
  );
}
