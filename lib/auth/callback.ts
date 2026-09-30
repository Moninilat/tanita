import type { SupabaseClient } from "@supabase/supabase-js";
import { safeInternalRedirect } from "./redirect";

export type InviteCallback =
  | { kind: "code"; code: string; next: string }
  | { kind: "token-hash"; tokenHash: string; next: string }
  | { kind: "session"; accessToken: string; refreshToken: string; next: string }
  | { kind: "error"; next: string }
  | { kind: "invalid"; next: string };

export function parseInviteCallback(search: string, hash: string): InviteCallback {
  const searchParams = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const next = safeInternalRedirect(searchParams.get("next"));

  if (searchParams.has("error") || hashParams.has("error")) {
    return { kind: "error", next };
  }

  const code = searchParams.get("code");
  if (code) return { kind: "code", code, next };

  const tokenHash = searchParams.get("token_hash") ?? hashParams.get("token_hash");
  const type = searchParams.get("type") ?? hashParams.get("type");
  if (tokenHash && type === "invite") {
    return { kind: "token-hash", tokenHash, next };
  }

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  if (accessToken && refreshToken) {
    return { kind: "session", accessToken, refreshToken, next };
  }

  return { kind: "invalid", next };
}

export async function establishInviteSession(
  supabase: Pick<SupabaseClient["auth"], "exchangeCodeForSession" | "verifyOtp" | "setSession">,
  callback: InviteCallback,
): Promise<{ ok: boolean }> {
  if (callback.kind === "code") {
    const { error } = await supabase.exchangeCodeForSession(callback.code);
    return { ok: !error };
  }

  if (callback.kind === "token-hash") {
    const { error } = await supabase.verifyOtp({
      token_hash: callback.tokenHash,
      type: "invite",
    });
    return { ok: !error };
  }

  if (callback.kind === "session") {
    const { error } = await supabase.setSession({
      access_token: callback.accessToken,
      refresh_token: callback.refreshToken,
    });
    return { ok: !error };
  }

  return { ok: false };
}