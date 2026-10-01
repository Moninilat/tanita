# SPEC-010 Tasks

- [x] Define navigation view/item types and profile-aware internal URL helpers.
  - **File:** `lib/navigation.ts` (new)
  - **FR:** 3, 4, 5
  - **Done when:** The five destinations are defined once, generated URLs are internal, and a valid supplied `profileId` is included only on supported destinations.

- [x] Render the five primary navigation destinations from the shared component.
  - **File:** `components/navigation/primary-navigation.tsx` (new)
  - **FR:** 1, 3
  - **Done when:** The component renders links to Dashboard, Measurement history, Trends, New measurement, and Import history.

- [x] Add the existing sign-out action to shared navigation.
  - **File:** `components/navigation/primary-navigation.tsx`
  - **FR:** 2
  - **Done when:** The shared navigation renders the existing `SignOutButton` without duplicating sign-out behavior.

- [x] Expose the navigation purpose and current-view state accessibly.
  - **File:** `components/navigation/primary-navigation.tsx`
  - **FR:** 8
  - **Done when:** The navigation has an accessible name and the active destination exposes its current state; the component's links are keyboard operable.

- [x] Integrate shared navigation into the dashboard and its recoverable states.
  - **File:** `app/page.tsx`
  - **FR:** 1, 2, 4, 5, 7, 8
  - **Done when:** Dashboard, empty-profile/measurement, and recoverable-error render paths show the shared navigation, passing only the resolved profile when available.

- [x] Integrate shared navigation into measurement history and its recoverable states.
  - **File:** `app/measurements/page.tsx`
  - **FR:** 1–5, 7, 8
  - **Done when:** Normal, empty, and recoverable-error paths show navigation and pass only the resolved profile context.

- [x] Integrate shared navigation into trends and its recoverable states.
  - **File:** `app/measurements/trends/page.tsx`
  - **FR:** 1–5, 7, 8
  - **Done when:** Normal, empty, and recoverable-error paths show navigation and pass only the resolved profile context.

- [x] Integrate shared navigation into import and its recoverable states.
  - **File:** `app/measurements/import/page.tsx`
  - **FR:** 1–5, 7, 8
  - **Done when:** Normal, empty, and recoverable-error paths show navigation and pass only the validated profile context.

- [x] Integrate shared navigation into new measurement and its recoverable states.
  - **File:** `app/measurements/new/page.tsx`
  - **FR:** 1–4, 7, 8
  - **Done when:** The normal and recoverable-error paths show all primary destinations and the existing authenticated access behavior is unchanged.

- [x] Integrate shared navigation into edit measurement without removing its contextual return link.
  - **File:** `app/measurements/[id]/edit/page.tsx`
  - **FR:** 1–4, 6–8
  - **Done when:** The edit view shows primary navigation, retains a history link with the measurement's profile, and preserves existing `notFound()` behavior.

- [x] Test shared destinations, sign-out presence, current-view semantics, and profile-aware URLs.
  - **File:** `tests/navigation.test.tsx` (new)
  - **FR:** 1–5, 8
  - **Done when:** Focused tests assert all five links, the existing sign-out control, accessible active state, and profile inclusion/omission behavior.

- [x] Test edit-view navigation and return-to-history profile context.
  - **File:** `tests/measurement-edit-delete.test.tsx`
  - **FR:** 6, 7
  - **Done when:** Tests verify the edit view retains its profile-aware history return and keeps navigation available in applicable recoverable states.

- [ ] Verify responsive and keyboard navigation behavior.
  - **File:** `components/navigation/primary-navigation.tsx` and `app` route views
  - **FR:** 1, 7, 8
  - **Done when:** Manual keyboard and narrow-viewport checks reach all five destinations without horizontal page overflow.

- [x] Run project quality checks for the navigation change.
  - **File:** All files changed for SPEC-010
  - **FR:** 1–8
  - **Done when:** Targeted navigation/edit tests, `npm run lint`, and `npm run build` pass; authentication and ownership behavior remain unchanged.
