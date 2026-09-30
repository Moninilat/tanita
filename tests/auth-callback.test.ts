import { describe, expect, it, vi } from "vitest";
import { establishInviteSession, parseInviteCallback } from "../lib/auth/callback";

describe("Supabase invitation callback", () => {
  it("parses token-hash invite links and sanitizes the destination", () => {
    expect(parseInviteCallback(
      "?token_hash=one-time-hash&type=invite&next=%2Fmeasurements",
      "",
    )).toEqual({
      kind: "token-hash",
      tokenHash: "one-time-hash",
      next: "/measurements",
    });
  });

  it("parses PKCE code links", () => {
    expect(parseInviteCallback("?code=one-time-code", "")).toEqual({
      kind: "code",
      code: "one-time-code",
      next: "/",
    });
  });

  it("parses access/refresh token fragments from non-PKCE invite links", () => {
    expect(parseInviteCallback("", "#access_token=access&refresh_token=refresh&type=invite")).toEqual({
      kind: "session",
      accessToken: "access",
      refreshToken: "refresh",
      next: "/",
    });
  });

  it("verifies invite hashes, exchanges codes, and sets fragment sessions", async () => {
    const supabase = {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ error: null }),
      setSession: vi.fn().mockResolvedValue({ error: null }),
    };

    expect(await establishInviteSession(supabase, {
      kind: "token-hash",
      tokenHash: "hash",
      next: "/",
    })).toEqual({ ok: true });
    expect(supabase.verifyOtp).toHaveBeenCalledWith({ token_hash: "hash", type: "invite" });

    expect(await establishInviteSession(supabase, {
      kind: "code",
      code: "code",
      next: "/",
    })).toEqual({ ok: true });
    expect(supabase.exchangeCodeForSession).toHaveBeenCalledWith("code");

    expect(await establishInviteSession(supabase, {
      kind: "session",
      accessToken: "access",
      refreshToken: "refresh",
      next: "/",
    })).toEqual({ ok: true });
    expect(supabase.setSession).toHaveBeenCalledWith({ access_token: "access", refresh_token: "refresh" });
  });

  it("fails closed for wrong token types and missing callback credentials", async () => {
    expect(parseInviteCallback("?token_hash=hash&type=recovery", "").kind).toBe("invalid");
    expect(parseInviteCallback("?error=access_denied", "").kind).toBe("error");
    await expect(establishInviteSession({
      exchangeCodeForSession: vi.fn(),
      verifyOtp: vi.fn(),
      setSession: vi.fn(),
    }, { kind: "invalid", next: "/" })).resolves.toEqual({ ok: false });
  });
});
