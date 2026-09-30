import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { updateSession } from "../lib/supabase/proxy";

const { getUserMock } = vi.hoisted(() => ({ getUserMock: vi.fn() }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: getUserMock } }),
}));

describe("Supabase session proxy", () => {
  it("redirects unauthenticated private routes with a safe next path", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    const response = await updateSession(
      new NextRequest("https://tanita.example/measurements/import?profile=p1"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://tanita.example/sign-in?next=%2Fmeasurements%2Fimport%3Fprofile%3Dp1",
    );
  });

  it("keeps sign-in public and redirects authenticated sign-in visits safely", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    const publicResponse = await updateSession(new NextRequest("https://tanita.example/sign-in"));
    expect(publicResponse.status).toBe(200);

    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const signedInResponse = await updateSession(
      new NextRequest("https://tanita.example/sign-in?next=%2Fmeasurements"),
    );
    expect(signedInResponse.status).toBe(307);
    expect(signedInResponse.headers.get("location")).toBe("https://tanita.example/measurements");

    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    const callbackResponse = await updateSession(
      new NextRequest("https://tanita.example/auth/callback?token_hash=invite-token&type=invite"),
    );
    expect(callbackResponse.status).toBe(200);
  });
});
