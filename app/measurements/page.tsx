import Link from "next/link";
import SignOutButton from "@/components/auth/sign-out-button";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import {
  buildMeasurementHistory,
  formatMeasurementDate,
} from "@/lib/measurements/history";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ profile?: string }>;

export default async function MeasurementHistoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { supabase } = await requireAuthenticatedUser();
  const [{ data: profiles, error: profilesError }, { data: locations, error: locationsError }] =
    await Promise.all([
      supabase.from("profiles").select("id, name").order("name"),
      supabase.from("locations").select("id, name").order("name"),
    ]);

  const params = await searchParams;
  const profileId = profiles?.some((profile) => profile.id === params.profile)
    ? params.profile
    : profiles?.length === 1
      ? profiles[0].id
      : null;

  const { data: measurements, error: measurementsError } = profileId
    ? await supabase
        .from("measurements")
        .select(
          "id, location_id, measured_at, notes, entry_method, weight_kg, bmr_kcal, bone_mass_kg, visceral_fat_rating, body_fat_pct, muscle_mass_kg, muscle_quality_score, physique_rating, body_water_pct, heart_rate_bpm, metabolic_age, abdomen_cm, flexed_arm_cm, arm_cm, waist_cm, hip_cm, thigh_cm",
        )
        .eq("profile_id", profileId)
        .order("measured_at", { ascending: false })
        .order("id", { ascending: false })
    : { data: [], error: null };

  if (profilesError || locationsError || measurementsError) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold">Measurement history</h1>
        <p role="alert">Measurement history could not be loaded.</p>
      </main>
    );
  }

  const selectedProfile = profiles?.find((profile) => profile.id === profileId);
  const locationMap = Object.fromEntries((locations ?? []).map((location) => [location.id, location]));
  const history = buildMeasurementHistory(measurements ?? [], locationMap);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-5 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">History</p>
          <h1 className="mt-2 text-3xl font-semibold">Measurement history</h1>
          {selectedProfile && <p className="mt-2 text-zinc-600">{selectedProfile.name}</p>}
        </div>
        <nav aria-label="Measurement navigation" className="flex flex-col gap-2 sm:flex-row">
          <Link
            className="rounded border border-zinc-300 px-4 py-2.5 text-center font-medium text-zinc-700"
            href={profileId ? `/measurements/import?profile=${encodeURIComponent(profileId)}` : "/measurements/import"}
          >
            Import history
          </Link>
          <Link
            className="rounded border border-zinc-300 px-4 py-2.5 text-center font-medium text-zinc-700"
            href={profileId ? `/measurements/trends?profile=${encodeURIComponent(profileId)}` : "/measurements/trends"}
          >
            View trends
          </Link>
          <Link className="rounded bg-black px-4 py-2.5 text-center font-medium text-white" href="/">
            Dashboard
          </Link>
          <SignOutButton />
        </nav>
      </header>

      {profiles && profiles.length > 1 && (
        <form className="flex flex-col gap-2 sm:max-w-xs" method="get">
          <label className="font-medium" htmlFor="profile">Profile</label>
          <select
            className="rounded border border-zinc-300 bg-white px-3 py-2"
            defaultValue={profileId ?? ""}
            id="profile"
            name="profile"
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </form>
      )}

      {!profileId ? (
        <section className="rounded border border-dashed border-zinc-300 p-8">
          <h2 className="text-xl font-semibold">No profiles yet.</h2>
          <p className="mt-2 text-zinc-600">Create a profile before reviewing measurements.</p>
        </section>
      ) : history.length === 0 ? (
        <section className="rounded border border-dashed border-zinc-300 p-8">
          <h2 className="text-xl font-semibold">No measurements recorded.</h2>
          <p className="mt-2 text-zinc-600">
            {selectedProfile ? `No history is available for ${selectedProfile.name}.` : "This profile has no measurements yet."}
          </p>
        </section>
      ) : (
        <ul className="grid gap-5">
          {history.map((item) => (
            <li key={item.id} className="rounded border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 border-b border-zinc-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Recorded</p>
                  <h2 className="mt-1 text-xl font-semibold">{formatMeasurementDate(item.measured_at)}</h2>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Location</p>
                  <p className="mt-1 font-medium text-zinc-800">{item.locationName}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
                <span className="rounded bg-zinc-100 px-2 py-1 font-medium">{item.entryMethod}</span>
                {item.notes && <span className="rounded bg-zinc-100 px-2 py-1">{item.notes}</span>}
              </div>

              {item.details.length > 0 ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {item.details.map((detail) => (
                    <div key={`${item.id}-${detail.label}`} className="rounded border border-zinc-200 bg-zinc-50 p-3">
                      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{detail.label}</dt>
                      <dd className="mt-1 text-base font-medium text-zinc-900">{detail.value}</dd>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm text-zinc-600">This measurement does not include any recorded metric values.</p>
              )}

              <div className="mt-5 flex justify-end">
                <Link
                  className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700"
                  href={`/measurements/${item.id}/edit`}
                >
                  Edit measurement
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
