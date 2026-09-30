import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAuthenticatedUser } from "../lib/auth/server";

const { createClientMock, getUserMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

beforeEach(() => {
  getUserMock.mockReset();
  createClientMock.mockResolvedValue({ auth: { getUser: getUserMock } });
});

describe("verified server authentication", () => {
  it("redirects when Supabase cannot verify an authenticated user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    await expect(requireAuthenticatedUser()).rejects.toThrow("REDIRECT:/sign-in");
  });

  it("returns the verified user and the same session client", async () => {
    const user = { id: "user-1", email: "owner@example.test" };
    getUserMock.mockResolvedValue({ data: { user }, error: null });
    const client = await createClientMock();

    await expect(requireAuthenticatedUser()).resolves.toEqual({ supabase: client, user });
    expect(getUserMock).toHaveBeenCalledOnce();
  });
});
