import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import PrimaryNavigation from "@/components/navigation/primary-navigation";
import { getPrimaryNavigationItems } from "@/lib/navigation";

vi.mock("@/components/auth/sign-out-button", () => ({
  default: () => createElement("button", { type: "button" }, "Sign out"),
}));

const expectedDestinations = [
  ["dashboard", "Dashboard", "/?profile=p-1"],
  ["history", "Measurement history", "/measurements?profile=p-1"],
  ["trends", "Trends", "/measurements/trends?profile=p-1"],
  ["new-measurement", "New measurement", "/measurements/new"],
  ["import", "Import history", "/measurements/import?profile=p-1"],
] as const;

describe("primary navigation", () => {
  it("defines the five internal destinations and preserves profile only where supported", () => {
    const items = getPrimaryNavigationItems("p-1");

    expect(items).toEqual(
      expectedDestinations.map(([destination, label, href]) => ({
        destination,
        label,
        href,
      })),
    );
    expect(items.every((item) => item.href.startsWith("/"))).toBe(true);
  });

  it("renders the destinations, sign-out control, and accessible current-page state", () => {
    const html = renderToStaticMarkup(
      createElement(PrimaryNavigation, { view: "history", profileId: "p-1" }),
    );

    expect(html).toContain('aria-label="Primary navigation"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Sign out");
    for (const [, label] of expectedDestinations) {
      expect(html).toContain(label);
    }
  });

  it("marks history as the current section while editing a measurement", () => {
    const html = renderToStaticMarkup(
      createElement(PrimaryNavigation, { view: "edit", profileId: "p-1" }),
    );

    expect(html).toContain('aria-current="location"');
    expect(html).toContain('href="/measurements?profile=p-1"');
  });
});
