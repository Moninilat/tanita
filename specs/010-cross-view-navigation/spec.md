# SPEC-010: Cross-View Navigation

## Context and objective

The application already has authenticated views for the dashboard, measurement history, trends, data import, measurement creation, and editing an existing measurement. Navigation links are currently defined separately on each page, and coverage is inconsistent. For example, the dashboard only links to creating a measurement and signing out.

The objective is to provide consistent primary navigation between all authenticated functional views without changing authentication, ownership, queries, forms, or measurement data behavior.

Included routes:

- Dashboard: `/`
- Measurement history: `/measurements`
- Trends: `/measurements/trends`
- New measurement: `/measurements/new`
- Import history: `/measurements/import`
- Edit measurement: `/measurements/[id]/edit`

Navigation must also be available when a view displays an empty state or a recoverable loading error.

## Users / actors

- Authenticated user: navigates between the measurement-related functional views and signs out.
- Unauthenticated visitor: is not part of the primary navigation; access to protected views continues to follow the existing authentication flow.

## User stories

- As an authenticated user, I want to access the other primary views from any functional view so that I do not have to return to the dashboard or enter routes manually.
- As an authenticated user, I want to return from the edit form to measurement history while preserving the selected profile when possible.
- As an authenticated user, I want to find the sign-out option from every functional view.
- As a user viewing an empty state or recoverable error, I want to keep navigation available so I can continue to another view.

## Functional requirements

1. Primary navigation must provide access to Dashboard, Measurement history, Trends, New measurement, and Import history from each of the six included routes.
2. The sign-out option must be available on every included view and must use the existing sign-out action.
3. The implementation must maintain one consistent definition of the navigation destinations; pages must not end up with divergent sets of primary links.
4. Destinations must use the existing internal routes. Navigation must not introduce external redirects or change authentication and ownership checks.
5. When a profile is selected and a destination supports the `profile` parameter, navigation must preserve that profile whenever it is valid and relevant to the destination. Profile selection and any required destination-profile confirmation must continue to work as they do now.
6. The edit view must retain a clear link back to the history for the edited measurement and preserve its associated profile when available, in addition to primary navigation.
7. Empty states and recoverable errors on included views must continue to display primary navigation. Errors that block a view must also retain a safe way to reach a functional view where appropriate.
8. Navigation must semantically identify its purpose and the current page. The link for the current route must expose its current state accessibly.

## Non-functional requirements

- Navigation must be usable with a keyboard and screen readers, with understandable names for its links and controls.
- On narrow screens, all destinations must remain accessible without causing horizontal page overflow.
- Navigation must fit the application's existing styles and conventions.
- The solution must not duplicate authentication rules or add direct Supabase access from navigation components.
- Navigation must not require schema changes, migrations, or changes to stored data.

## Edge cases

- If there are no profiles or measurements, navigation destinations remain visible; each destination view displays its corresponding empty state.
- If no profile is selected, links to Measurement history, Trends, or Import history must not invent or implicitly select a different profile. The destination follows its existing profile-selection or no-selection behavior.
- If the `profile` parameter is missing or invalid, it must not be propagated as valid context; the destination applies its existing profile-resolution behavior.
- If a query fails and the page displays a recoverable error, primary navigation remains available alongside the error message.
- If the measurement in an edit URL does not exist or is inaccessible, the existing error/not-found behavior is preserved, and navigation must not expose information about that measurement.
- Sign-in, invitation callback, and password setup pages are authentication flows, not functional views included in primary navigation.

## Out of scope

- Changing authentication, authorization, RLS policies, ownership, or sign-out behavior.
- Adding, removing, or renaming routes or features.
- Changing profile-selection logic or measurement query, import, creation, editing, or deletion behavior.
- Changing the overall page design beyond what is necessary to integrate navigation.
- Adding primary navigation to sign-in, invitation callback, or password setup pages.

## Completion criteria

- WHEN an authenticated user visits any included route, THE SYSTEM SHALL display navigation links to Dashboard, Measurement history, Trends, New measurement, and Import history.
- WHEN an authenticated user visits any included route, THE SYSTEM SHALL provide the existing sign-out control.
- WHEN a user activates a navigation link, THE SYSTEM SHALL open the corresponding internal route without bypassing authentication or ownership checks.
- WHEN a valid profile is selected and the destination supports `profile`, THE SYSTEM SHALL preserve that profile in the navigation link.
- WHEN a user visits a measurement edit view, THE SYSTEM SHALL provide a clear path back to measurement history and preserve the profile context when available.
- WHEN an included view displays an empty state or recoverable error, THE SYSTEM SHALL keep its primary navigation controls available.
- WHEN the current route is displayed, THE SYSTEM SHALL accessibly communicate which link represents the current page.
- WHEN the application is used with a keyboard or on a narrow screen, THE SYSTEM SHALL allow access to all destinations without loss of functionality or horizontal page overflow.
- WHEN an unauthenticated user requests a protected route, THE SYSTEM SHALL preserve the existing redirect-to-authentication flow.

## Open questions

- The specific responsive presentation (for example, links in a row or a compact mobile menu) is left to implementation, provided the accessibility and destination-availability requirements are met.