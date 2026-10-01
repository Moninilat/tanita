# SPEC-010 Implementation Plan

## Affected files

| File | Responsibility | Requirements |
| --- | --- | --- |
| `lib/navigation.ts` (new) | Define navigation view/item types, the five internal destinations, and profile-aware href construction. Accept only profile context validated by the calling page. | FR3–FR5 |
| `components/navigation/primary-navigation.tsx` (new) | Render the shared navigation, accessible current-view state, and existing `SignOutButton`. | FR1–FR3, FR8 |
| `app/page.tsx` | Add shared navigation to dashboard normal, empty, and recoverable error states. | FR1, FR2, FR4, FR5, FR7, FR8 |
| `app/measurements/page.tsx` | Add shared navigation to history normal, empty, and recoverable error states; pass resolved profile context. | FR1–FR5, FR7–FR8 |
| `app/measurements/trends/page.tsx` | Add shared navigation to trends normal, empty, and recoverable error states; pass resolved profile context. | FR1–FR5, FR7–FR8 |
| `app/measurements/import/page.tsx` | Add shared navigation to import normal, empty, and recoverable error states; pass validated profile context. | FR1–FR5, FR7–FR8 |
| `app/measurements/new/page.tsx` | Add shared navigation to the new-measurement view and recoverable errors. | FR1–FR4, FR7–FR8 |
| `app/measurements/[id]/edit/page.tsx` | Add shared navigation while retaining the profile-aware return-to-history link and existing `notFound()` behavior. | FR1–FR4, FR6–FR8 |
| `tests/navigation.test.tsx` (new) | Verify destinations, sign-out availability, current-view accessibility, and profile-aware URLs. | FR1–FR5, FR8 |
| `tests/measurement-edit-delete.test.tsx` | Verify edit navigation and return-to-history profile context. | FR6–FR7 |

## Types

- `NavigationView`: the six authenticated views (`dashboard`, `history`, `trends`, `new-measurement`, `import`, `edit`).
- `NavigationItem`: destination key, accessible label, and internal `href`.
- `PrimaryNavigationProps`: current view and optional validated `profileId`.

Do not resolve profiles, access Supabase, or change authentication behavior in the navigation component.

## Verification

- Run the targeted navigation and edit tests.
- Run `npm run lint` and `npm run build`.
- Manually verify keyboard navigation and a narrow viewport: all five destinations remain reachable and no horizontal overflow occurs.
- Confirm profile context is kept only for destinations that already support it; auth and ownership behavior remains unchanged.
