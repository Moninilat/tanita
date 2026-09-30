"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { establishInviteSession, parseInviteCallback } from "@/lib/auth/callback";
import { createClient } from "@/lib/supabase/browser";

export default function InviteCallback() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const callback = parseInviteCallback(window.location.search, window.location.hash);

    void establishInviteSession(createClient().auth, callback)
      .then(({ ok }) => {
        if (!active) return;
        if (!ok) {
          router.replace("/sign-in?error=invite");
          return;
        }
        router.replace(`/set-password?next=${encodeURIComponent(callback.next)}`);
        router.refresh();
      })
      .catch(() => {
        if (active) router.replace("/sign-in?error=invite");
      });

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold">Checking your invitation</h1>
      <p aria-live="polite" className="mt-3 text-zinc-600" role="status">
        Verifying the secure sign-in link. This may take a moment.
      </p>
      <noscript>
        <p className="mt-4 text-sm text-red-800">JavaScript is required to complete this invitation. Return to <Link href="/sign-in" className="underline">sign in</Link>.</p>
      </noscript>
    </main>
  );
}
