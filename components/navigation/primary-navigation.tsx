import Link from "next/link";
import SignOutButton from "@/components/auth/sign-out-button";
import {
  getPrimaryNavigationItems,
  type NavigationDestination,
  type NavigationView,
} from "@/lib/navigation";

type PrimaryNavigationProps = {
  view: NavigationView;
  profileId?: string | null;
};

export default function PrimaryNavigation({
  view,
  profileId,
}: PrimaryNavigationProps) {
  const items = getPrimaryNavigationItems(profileId);
  const currentDestination: NavigationDestination = view === "edit" ? "history" : view;

  return (
    <nav
      aria-label="Primary navigation"
      className="flex w-full flex-col gap-3 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <ul className="flex min-w-0 flex-wrap gap-2">
        {items.map((item) => {
          const isCurrent = item.destination === currentDestination;
          const ariaCurrent = isCurrent
            ? view === "edit"
              ? "location"
              : "page"
            : undefined;

          return (
            <li key={item.destination}>
              <Link
                aria-current={ariaCurrent}
                className={`block rounded border px-3 py-2 text-center font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                  isCurrent
                    ? "border-black bg-black text-white"
                    : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                }`}
                href={item.href}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <SignOutButton />
    </nav>
  );
}
