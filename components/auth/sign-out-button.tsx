import { signOut } from "@/lib/auth/actions";

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        className="rounded border border-zinc-300 px-4 py-2.5 text-center font-medium text-zinc-700"
        type="submit"
      >
        Sign out
      </button>
    </form>
  );
}