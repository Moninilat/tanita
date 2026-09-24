import { createClient } from "@/lib/supabase/server";
import MetricCard from "@/components/dashboard/metric-card";
import { summarizeDashboard } from "@/lib/dashboard/data";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ profile?: string }>;

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name")
    .order("name");

  const params = await searchParams;
  const profileId = profiles?.some((profile) => profile.id === params.profile)
    ? params.profile
    : profiles?.length === 1
      ? profiles[0].id
      : profiles?.[0]?.id;
  const { data: measurements, error } = profileId
    ? await supabase
      .from("measurements")
      .select("id, measured_at, weight_kg, body_fat_pct, muscle_mass_kg, waist_cm, hip_cm")
      .eq("profile_id", profileId)
      .order("measured_at", { ascending: true })
      .order("id", { ascending: true })
    : { data: [], error: null };

  if (profilesError || error) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p role="alert">Dashboard data could not be loaded.</p>
      </main>
    );
  }

  const selectedProfile = profiles?.find((profile) => profile.id === profileId);
  const summaries = summarizeDashboard(measurements ?? []);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-5 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Body metrics</p>
          <h1 className="mt-2 text-3xl font-semibold">Dashboard</h1>
          {selectedProfile && <p className="mt-2 text-zinc-600">{selectedProfile.name}</p>}
        </div>
        <a className="rounded bg-black px-4 py-2.5 text-center font-medium text-white" href="/measurements/new">
          New measurement
        </a>
      </header>

      {profiles && profiles.length > 1 && (
        <form className="flex flex-col gap-2 sm:max-w-xs" method="get">
          <label className="font-medium" htmlFor="profile">Profile</label>
          <select className="rounded border border-zinc-300 bg-white px-3 py-2" defaultValue={profileId ?? ""} id="profile" name="profile">
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </select>
        </form>
      )}

      {!profileId ? (
        <section className="rounded border border-dashed border-zinc-300 p-8">
          <h2 className="text-xl font-semibold">No profiles yet.</h2>
          <p className="mt-2 text-zinc-600">Create a profile before recording measurements.</p>
        </section>
      ) : measurements?.length === 0 ? (
        <section className="rounded border border-dashed border-zinc-300 p-8">
          <h2 className="text-xl font-semibold">No measurements yet.</h2>
          <p className="mt-2 text-zinc-600">Add the first measurement for {selectedProfile?.name ?? "this profile"}.</p>
          <a className="mt-5 inline-block rounded bg-black px-4 py-2.5 font-medium text-white" href="/measurements/new">New measurement</a>
        </section>
      ) : (
        <section aria-labelledby="metrics-heading">
          <h2 className="sr-only" id="metrics-heading">Current metrics</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Weight" summary={summaries.weight} currentUnit="kg" changeUnit="kg" currentDecimals={2} changeDecimals={2} />
            <MetricCard label="Body fat" summary={summaries.bodyFat} currentUnit="%" changeUnit="pp" currentDecimals={1} changeDecimals={1} />
            <MetricCard label="Body fat mass" summary={summaries.bodyFatMass} currentUnit="kg" changeUnit="kg" currentDecimals={2} changeDecimals={2} />
            <MetricCard label="Muscle mass" summary={summaries.muscleMass} currentUnit="kg" changeUnit="kg" currentDecimals={2} changeDecimals={2} />
            <MetricCard label="Waist" summary={summaries.waist} currentUnit="cm" changeUnit="cm" currentDecimals={1} changeDecimals={1} />
            <MetricCard label="Waist-to-hip ratio" summary={summaries.waistToHipRatio} currentUnit="" changeUnit="" currentDecimals={2} changeDecimals={2} />
          </div>
        </section>
      )}
    </main>
  );
}
