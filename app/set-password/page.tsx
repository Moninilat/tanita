import PasswordSetupForm from "@/components/auth/password-setup-form";
import { safeInternalRedirect } from "@/lib/auth/redirect";
import { requireAuthenticatedUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ next?: string | string[] }>;

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAuthenticatedUser();
  const params = await searchParams;
  const next = safeInternalRedirect(typeof params.next === "string" ? params.next : null);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Account setup</p>
        <h1 className="mt-2 text-3xl font-semibold">Set your password</h1>
        <p className="mt-2 text-zinc-600">Choose a password to finish accepting your invitation.</p>
      </header>
      <PasswordSetupForm next={next} />
    </main>
  );
}
