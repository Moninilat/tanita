export type NavigationView =
  | "dashboard"
  | "history"
  | "trends"
  | "new-measurement"
  | "import"
  | "edit";

export type NavigationDestination =
  | "dashboard"
  | "history"
  | "trends"
  | "new-measurement"
  | "import";

export type NavigationItem = {
  destination: NavigationDestination;
  label: string;
  href: string;
};

type NavigationDestinationDefinition = {
  label: string;
  pathname: string;
  supportsProfile: boolean;
};

const navigationDestinations: Record<NavigationDestination, NavigationDestinationDefinition> = {
  dashboard: {
    label: "Dashboard",
    pathname: "/",
    supportsProfile: true,
  },
  history: {
    label: "Measurement history",
    pathname: "/measurements",
    supportsProfile: true,
  },
  trends: {
    label: "Trends",
    pathname: "/measurements/trends",
    supportsProfile: true,
  },
  "new-measurement": {
    label: "New measurement",
    pathname: "/measurements/new",
    supportsProfile: false,
  },
  import: {
    label: "Import history",
    pathname: "/measurements/import",
    supportsProfile: true,
  },
};

export function getPrimaryNavigationItems(profileId?: string | null): NavigationItem[] {
  return (Object.entries(navigationDestinations) as [
    NavigationDestination,
    NavigationDestinationDefinition,
  ][]).map(([destination, definition]) => {
    const query = new URLSearchParams();
    if (definition.supportsProfile && profileId) {
      query.set("profile", profileId);
    }

    const search = query.toString();

    return {
      destination,
      label: definition.label,
      href: search ? `${definition.pathname}?${search}` : definition.pathname,
    };
  });
}
