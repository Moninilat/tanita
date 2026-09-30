"use client";

import { useActionState } from "react";
import { setInitialPassword, type PasswordSetupState } from "@/lib/auth/actions";

const initialState: PasswordSetupState = { error: null };

export default function PasswordSetupForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(setInitialPassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input name="next" type="hidden" value={next} />
      <label className="flex flex-col gap-2">
        <span className="font-medium">New password</span>
        <input
          autoComplete="new-password"
          className="rounded border border-zinc-300 px-3 py-2.5"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-medium">Confirm password</span>
        <input
          autoComplete="new-password"
          className="rounded border border-zinc-300 px-3 py-2.5"
          minLength={8}
          name="password_confirmation"
          required
          type="password"
        />
      </label>
      {state.error && <p className="text-sm text-red-800" role="alert">{state.error}</p>}
      <button
        className="rounded bg-black px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {pending ? "Setting password..." : "Set password"}
      </button>
    </form>
  );
}
