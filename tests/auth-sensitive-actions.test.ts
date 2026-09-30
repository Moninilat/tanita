import { describe, expect, it, vi } from "vitest";
import { createMeasurement } from "../lib/measurements/actions";

const { requireAuthenticatedUserMock, insertMock } = vi.hoisted(() => ({
  requireAuthenticatedUserMock: vi.fn(),
  insertMock: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  requireAuthenticatedUser: requireAuthenticatedUserMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({ insert: insertMock }),
  }),
}));

describe("authentication-sensitive measurement actions", () => {
  it("performs no database mutation when the verified-user guard rejects", async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new Error("UNAUTHENTICATED"));
    const data = new FormData();
    data.set("profile_id", "profile-1");
    data.set("location_id", "location-1");
    data.set("measurement_date", "2026-09-01");
    data.set("weight_kg", "60");

    await expect(createMeasurement({ status: "idle", message: "", errors: [] }, data))
      .rejects.toThrow("UNAUTHENTICATED");
    expect(insertMock).not.toHaveBeenCalled();
  });
});
