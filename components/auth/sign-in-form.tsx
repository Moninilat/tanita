"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/lib/auth/actions";

const initialSignInState: SignInState = { error: null };

export default function SignInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialSignInState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input name="next" type="hidden" value={next} />
      <label className="flex flex-col gap-2">
        <span className="font-medium">Email</span>
        <input
          autoComplete="email"
          className="rounded border border-zinc-300 px-3 py-2.5"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-medium">Password</span>
        <input
          autoComplete="current-password"
          className="rounded border border-zinc-300 px-3 py-2.5"
          name="password"
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
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}