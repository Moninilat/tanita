import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type UserContext = {
  id: string;
  client: SupabaseClient;
  profileId: string;
  locationId: string;
};

const supabaseUrl = process.env.LOCAL_SUPABASE_URL;
const publishableKey = process.env.LOCAL_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
const isLocalUrl = Boolean(supabaseUrl && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(supabaseUrl));
const integrationEnabled = Boolean(isLocalUrl && publishableKey && serviceRoleKey);

const integration = describe.skipIf(!integrationEnabled);

integration("Supabase RLS two-user isolation", () => {
  let admin: SupabaseClient | undefined;
  let userA: UserContext | undefined;
  let userB: UserContext | undefined;
  let measurementId = "";
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    admin = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const createdUsers = await Promise.all([
      admin.auth.admin.createUser({
        email: `rls-a-${suffix}@example.test`,
        password: `A-${suffix}-password!`,
        email_confirm: true,
      }),
      admin.auth.admin.createUser({
        email: `rls-b-${suffix}@example.test`,
        password: `B-${suffix}-password!`,
        email_confirm: true,
      }),
    ]);
    const userAData = createdUsers[0].data.user;
    const userBData = createdUsers[1].data.user;
    if (!userAData || !userBData || createdUsers.some((result) => result.error)) {
      throw new Error("Could not create disposable local Auth users for RLS tests.");
    }
    createdUserIds.push(userAData.id, userBData.id);

    const clientA = createClient(supabaseUrl!, publishableKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const clientB = createClient(supabaseUrl!, publishableKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const [signInA, signInB] = await Promise.all([
      clientA.auth.signInWithPassword({ email: userAData.email!, password: `A-${suffix}-password!` }),
      clientB.auth.signInWithPassword({ email: userBData.email!, password: `B-${suffix}-password!` }),
    ]);
    if (signInA.error || signInB.error) throw new Error("Could not sign in disposable local RLS users.");

    const [profileA, locationA, profileB, locationB] = await Promise.all([
      clientA.from("profiles").insert({ name: "RLS User A" }).select("id").single(),
      clientA.from("locations").insert({ name: `RLS A ${suffix}` }).select("id").single(),
      clientB.from("profiles").insert({ name: "RLS User B" }).select("id").single(),
      clientB.from("locations").insert({ name: `RLS B ${suffix}` }).select("id").single(),
    ]);
    if (profileA.error || locationA.error || profileB.error || locationB.error) {
      throw new Error("Could not create disposable owned profile/location rows.");
    }

    userA = { id: userAData.id, client: clientA, profileId: profileA.data.id, locationId: locationA.data.id };
    userB = { id: userBData.id, client: clientB, profileId: profileB.data.id, locationId: locationB.data.id };

    const ownMeasurement = await clientA.from("measurements").insert({
      profile_id: userA.profileId,
      location_id: userA.locationId,
      measured_at: "2026-09-01T12:00:00.000Z",
      entry_method: "manual",
      weight_kg: 60,
    }).select("id").single();
    if (ownMeasurement.error) throw new Error("Could not create the owned measurement fixture.");
    measurementId = ownMeasurement.data.id;
  });

  afterAll(async () => {
    if (!admin) return;
    if (userA?.profileId) await admin.from("measurements").delete().eq("profile_id", userA.profileId);
    if (userB?.profileId) await admin.from("measurements").delete().eq("profile_id", userB.profileId);
    if (userA?.profileId) await admin.from("profiles").delete().eq("id", userA.profileId);
    if (userB?.profileId) await admin.from("profiles").delete().eq("id", userB.profileId);
    if (userA?.locationId) await admin.from("locations").delete().eq("id", userA.locationId);
    if (userB?.locationId) await admin.from("locations").delete().eq("id", userB.locationId);
    for (const userId of createdUserIds) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it("isolates profile and location reads and mutations", async () => {
    const ownerA = userA!;
    const ownerB = userB!;
    const [profilesA, profilesB, locationsA, locationsB] = await Promise.all([
      ownerA.client.from("profiles").select("id, user_id"),
      ownerB.client.from("profiles").select("id, user_id"),
      ownerA.client.from("locations").select("id, user_id"),
      ownerB.client.from("locations").select("id, user_id"),
    ]);

    expect(profilesA.data?.map((row) => row.id)).toContain(ownerA.profileId);
    expect(profilesA.data?.some((row) => row.user_id !== ownerA.id)).toBe(false);
    expect(profilesA.data?.map((row) => row.id)).not.toContain(ownerB.profileId);
    expect(profilesB.data?.map((row) => row.id)).toContain(ownerB.profileId);
    expect(locationsA.data?.map((row) => row.id)).toContain(ownerA.locationId);
    expect(locationsA.data?.map((row) => row.id)).not.toContain(ownerB.locationId);
    expect(locationsB.data?.map((row) => row.id)).toContain(ownerB.locationId);

    const forgedProfile = await ownerA.client.from("profiles").insert({ name: "Forged owner", user_id: ownerB.id }).select("id");
    const forgedLocation = await ownerA.client.from("locations").insert({ name: "Forged location", user_id: ownerB.id }).select("id");
    expect(forgedProfile.error).not.toBeNull();
    expect(forgedLocation.error).not.toBeNull();

    const ownProfileUpdate = await ownerA.client.from("profiles").update({ name: "RLS User A updated" }).eq("id", ownerA.profileId).select("id").single();
    const crossProfileUpdate = await ownerA.client.from("profiles").update({ name: "Tampered" }).eq("id", ownerB.profileId).select("id");
    expect(ownProfileUpdate.data?.id).toBe(ownerA.profileId);
    expect(crossProfileUpdate.data).toEqual([]);

    const extraProfile = await ownerA.client.from("profiles").insert({ name: "RLS delete profile" }).select("id").single();
    if (extraProfile.error || !extraProfile.data) throw new Error("Could not create the profile-delete fixture.");
    const extraProfileId = extraProfile.data.id;
    const hiddenProfileDelete = await ownerA.client.from("profiles").delete().eq("id", ownerB.profileId).select("id");
    const ownProfileDelete = await ownerA.client.from("profiles").delete().eq("id", extraProfileId).select("id").single();
    expect(hiddenProfileDelete.data).toEqual([]);
    expect(ownProfileDelete.data?.id).toBe(extraProfileId);

    const extraLocation = await ownerA.client.from("locations").insert({ name: "RLS delete location" }).select("id").single();
    if (extraLocation.error || !extraLocation.data) throw new Error("Could not create the location-delete fixture.");
    const extraLocationId = extraLocation.data.id;
    const hiddenLocationDelete = await ownerA.client.from("locations").delete().eq("id", ownerB.locationId).select("id");
    const ownLocationDelete = await ownerA.client.from("locations").delete().eq("id", extraLocationId).select("id").single();
    expect(hiddenLocationDelete.data).toEqual([]);
    expect(ownLocationDelete.data?.id).toBe(extraLocationId);
  });

  it("allows owned measurement CRUD but rejects cross-owner profile/location associations", async () => {
    const ownerA = userA!;
    const ownerB = userB!;
    const [readA, readB] = await Promise.all([
      ownerA.client.from("measurements").select("id, profile_id, location_id"),
      ownerB.client.from("measurements").select("id, profile_id, location_id"),
    ]);
    expect(readA.data?.some((row) => row.id === measurementId)).toBe(true);
    expect(readB.data?.some((row) => row.id === measurementId)).toBe(false);

    const crossProfile = await ownerA.client.from("measurements").insert({
      profile_id: ownerB.profileId,
      location_id: ownerA.locationId,
      measured_at: "2026-09-02T12:00:00.000Z",
      entry_method: "manual",
      weight_kg: 61,
    });
    const crossLocation = await ownerA.client.from("measurements").insert({
      profile_id: ownerA.profileId,
      location_id: ownerB.locationId,
      measured_at: "2026-09-03T12:00:00.000Z",
      entry_method: "manual",
      weight_kg: 62,
    });
    expect(crossProfile.error).not.toBeNull();
    expect(crossLocation.error).not.toBeNull();

    const crossUpdate = await ownerA.client.from("measurements")
      .update({ profile_id: ownerB.profileId, location_id: ownerB.locationId })
      .eq("id", measurementId).select("id");
    expect(crossUpdate.error !== null || crossUpdate.data?.length === 0).toBe(true);

    const ownUpdate = await ownerA.client.from("measurements")
      .update({ weight_kg: 59.5 }).eq("id", measurementId).select("weight_kg").single();
    expect(ownUpdate.data?.weight_kg).toBe(59.5);

    const hiddenDelete = await ownerB.client.from("measurements").delete().eq("id", measurementId).select("id");
    expect(hiddenDelete.data).toEqual([]);
    const ownDelete = await ownerA.client.from("measurements").delete().eq("id", measurementId).select("id").single();
    expect(ownDelete.data?.id).toBe(measurementId);
  });
});
