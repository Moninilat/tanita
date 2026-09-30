import { beforeEach, describe, expect, it, vi } from "vitest";
import { safeInternalRedirect } from "../lib/auth/redirect";
import { setInitialPassword, signIn, signOut } from "../lib/auth/actions";

const { createClientMock, requireAuthenticatedUserMock, signInMock, signOutMock, updateUserMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  requireAuthenticatedUserMock: vi.fn(),
  signInMock: vi.fn(),
  signOutMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/auth/server", () => ({ requireAuthenticatedUser: requireAuthenticatedUserMock }));

beforeEach(() => {
  signInMock.mockReset();
  signOutMock.mockReset();
  updateUserMock.mockReset();
  requireAuthenticatedUserMock.mockResolvedValue({ supabase: { auth: { updateUser: updateUserMock } }, user: { id: "user-1" } });
  createClientMock.mockResolvedValue({
    auth: {
      signInWithPassword: signInMock,
      signOut: signOutMock,
    },
  });
});

describe("authentication flows", () => {
  it("accepts only same-origin relative redirect targets", () => {
    expect(safeInternalRedirect("/measurements?profile=p1")).toBe("/measurements?profile=p1");
    expect(safeInternalRedirect("//evil.example/path")).toBe("/");
    expect(safeInternalRedirect("https://evil.example/path")).toBe("/");
    expect(safeInternalRedirect("/\\evil.example")).toBe("/");
    expect(safeInternalRedirect(undefined)).toBe("/");
  });

  it("returns a generic error when credentials are rejected", async () => {
    signInMock.mockResolvedValue({ error: new Error("secret provider detail") });
    const data = new FormData();
    data.set("email", "user@example.com");
    data.set("password", "wrong-password");
    data.set("next", "/measurements");

    await expect(signIn({ error: null }, data)).resolves.toEqual({
      error: "Sign-in failed. Check your credentials and try again.",
    });
  });

  it("redirects successful email/password sign-in to the safe requested route", async () => {
    signInMock.mockResolvedValue({ error: null });
    const data = new FormData();
    data.set("email", " user@example.com ");
    data.set("password", "correct-password");
    data.set("next", "/measurements/import?profile=p1");

    await expect(signIn({ error: null }, data)).rejects.toThrow("REDIRECT:/measurements/import?profile=p1");
    expect(signInMock).toHaveBeenCalledWith({ email: "user@example.com", password: "correct-password" });
  });

  it("signs out and returns to the public sign-in route", async () => {
    signOutMock.mockResolvedValue({ error: null });

    await expect(signOut()).rejects.toThrow("REDIRECT:/sign-in");
    expect(signOutMock).toHaveBeenCalledOnce();
  });

  it("keeps password confirmation errors local and does not update Auth", async () => {
    const formData = new FormData();
    formData.set("password", "new-password-123");
    formData.set("password_confirmation", "different-password");

    await expect(setInitialPassword({ error: null }, formData)).resolves.toEqual({
      error: "The passwords do not match.",
    });
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("updates the invited user's password and redirects to a safe app route", async () => {
    updateUserMock.mockResolvedValue({ error: null });
    const formData = new FormData();
    formData.set("password", "new-password-123");
    formData.set("password_confirmation", "new-password-123");
    formData.set("next", "/measurements?profile=p1");

    await expect(setInitialPassword({ error: null }, formData)).rejects.toThrow(
      "REDIRECT:/measurements?profile=p1",
    );
    expect(updateUserMock).toHaveBeenCalledWith({ password: "new-password-123" });
  });
});
