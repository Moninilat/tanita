import SignInForm from "@/components/auth/sign-in-form";
import { safeInternalRedirect } from "@/lib/auth/redirect";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ next?: string | string[]; error?: string | string[] }>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const next = safeInternalRedirect(typeof params.next === "string" ? params.next : null);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Tanita tracker</p>
        <h1 className="mt-2 text-3xl font-semibold">Sign in</h1>
      </header>
      {params.error === "invite" && (
        <p className="mb-5 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900" role="alert">
          This invitation link is invalid or has expired. Ask the administrator to send a new invitation.
        </p>
      )}
      <SignInForm next={next} />
    </main>
  );
}