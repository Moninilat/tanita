# ============================================

# FILE: specs/009-authentication-rls.md

# ============================================

# SPEC-009: Authentication and Row Level Security

## Status

Ownership migrations applied; interactive session and two-user RLS verification remain pending invitation acceptance and a local Supabase runtime.

---

## Goal

Add Supabase email/password authentication and database-enforced ownership for the Tanita application. An authenticated user must only be able to read and mutate their own profiles, locations, and measurements, even when requests bypass the UI or manipulate IDs.

This phase hardens the completed measurement creation, history, edit/delete, trends, and CSV/XLSX import workflows. Authorization must be enforced by Supabase Row Level Security (RLS), not by profile filtering in the UI alone.

---

## Required context

Read only:

- `AGENTS.md`
- `DATABASE.md`
- `DATA_MODEL.md`
- `specs/001-supabase-integration.md`
- `specs/003-measurement-form.md`
- `specs/005-measurement-history.md`
- `specs/006-edit-delete-measurement.md`
- `specs/007-measurement-charts.md`
- `specs/008-historical-import.md`
- existing Supabase client, route, action, and migration source files

For Next.js-specific behavior, inspect the installed Next.js documentation for the current `proxy.ts`, cookie/session, route-handler, and server-action conventions before implementation. Do not rely on older middleware conventions without checking the installed version.

Do not read by default:

- `PROJECT.md`
- `README.md`
- `ROADMAP.md`
- unrelated specs

Do not inspect unrelated application code.

---

## Existing state

Already implemented:

- Next.js App Router application with Supabase SSR/browser clients using the publishable key
- profiles, locations, and measurements tables
- measurement create, history, edit/delete, trends, and CSV/XLSX import workflows
- no application authentication or RLS ownership model
- no `user_id` ownership column on profiles or locations
- measurements reference profiles and locations by foreign keys

The initial schema is deployed and contains development/reference data. It must not be assumed that all current rows can be discarded.

---

## Ownership model decision

Use one Supabase Auth user as the owner of each profile and location.

- Add required `user_id uuid` columns to `profiles` and `locations`, each referencing `auth.users(id)` with `ON DELETE CASCADE` or an explicitly documented equivalent that removes that user's owned data on account deletion. This implementation uses `ON DELETE RESTRICT` plus an operator-owned cleanup transaction that deletes owned measurements, profiles, and locations before deleting the Auth user.
- A profile belongs to exactly one auth user. A location belongs to exactly one auth user; locations are not global/shared reference data.
- Do not add `user_id` to `measurements` in this phase. Measurement ownership is derived through `profile_id`: a measurement is readable or mutable only when its related profile is owned by `auth.uid()`.
- A measurement's `location_id` must refer to a location owned by the same authenticated user as the related profile. RLS policies must enforce this on insert and update, in addition to the profile ownership condition.
- Do not support shared profiles, shared locations, teams, or organization ownership.

This is the simplest model that scopes the existing three tables to one account while keeping measurements attached to their existing profile relationship. User-supplied `user_id` values are never evidence of ownership; insert policies must require `user_id = auth.uid()` and updates must not permit transferring ownership.

---

## Required schema and migration strategy

Do not edit the already-applied initial migration. Add forward-only migration(s) under `supabase/migrations/`.

The migration plan must safely handle pre-auth development data:

1. Create the initial Supabase Auth user through the supported Supabase Auth setup before the ownership-enforcement migration is applied. Record that user's UUID through a secure operational procedure; never commit credentials or real user identifiers.
2. Back up the current database and verify counts and foreign-key integrity for all three tables.
3. During a controlled maintenance/cutover window, add nullable `user_id` columns to `profiles` and `locations`, backfill every existing profile and location to the designated initial user's Auth UUID, verify that no owner is NULL and that all related measurements refer to that user's owned profile and location, then make both columns `NOT NULL` and add their foreign keys.
4. Apply a deny-all lockdown migration that revokes `anon`/`PUBLIC` table privileges and enables/forces RLS without policies. Then, after the initial owner exists, apply the ownership/backfill/policy migration transaction. The interim state intentionally denies both anonymous and authenticated table access; do not reopen the app until owner policies are applied.
5. Deploy the authenticated application and verify with at least two distinct test users before reopening normal use.

The implementation must provide an operational backfill mechanism that does not hardcode a real user's UUID into committed SQL. The ownership migration may infer the initial owner only when exactly one non-deleted Auth user exists and must fail when zero or multiple candidates exist. The procedure must be repeatable only when safe and must fail rather than silently assigning rows to an arbitrary account when the owner UUID is absent or invalid.

If safe ownership cannot be established for all existing rows, stop the enforcement migration and require an explicit data-resolution decision. Do not delete data, assign rows based on UI state, disable RLS, or leave ownerless rows accessible to `anon` as a workaround.

Update `DATABASE.md` to document the resulting ownership columns, foreign keys, grants, RLS state, policy intent, and migration history after implementation.

---

## Authentication method and user flow

Use Supabase Auth email/password as the only authentication method in this phase. Do not add social/OAuth providers.

Provide:

- a sign-in route, recommended `/sign-in`
- a sign-out action available from the authenticated application shell/navigation
- clear invalid-credentials, missing-input, and generic Auth failure messages without exposing sensitive provider internals
- redirect to the originally requested safe internal path after sign-in, defaulting to `/`
- redirect to `/sign-in` after sign-out

Account creation is not required unless the existing Supabase project does not provide a controlled way to provision users. Prefer operator-managed account provisioning for the initial release. If self-service sign-up is necessary to make the basic email/password flow usable, require it to use the same ownership rules and define the first-owned-profile onboarding path; do not let a newly registered user see pre-existing rows.

Do not add password reset unless required to complete the basic sign-in lifecycle. Do not customize email verification in this phase; document and honor the Supabase project's existing confirmation setting. A user without a verified/usable session remains unauthenticated to protected routes.

### Invitation callback requirements

Invitation links must redirect to the application callback, not `/` or `/sign-in`:

```text
/auth/callback
```

The callback must support:

- `token_hash` plus `type=invite`, verified with `auth.verifyOtp({ token_hash, type: "invite" })`
- a PKCE `code`, exchanged with `auth.exchangeCodeForSession(code)` when present
- access/refresh token fragments from the non-PKCE `inviteUserByEmail` flow, installed with `auth.setSession`

After establishing the cookie-backed session, route to `/set-password`. The password page must require the verified session, validate matching password fields, call `auth.updateUser({ password })` through the publishable-key SSR client, then redirect to a sanitized internal `next` path or `/`. Invalid/expired links must show a generic message and must not retain a token in the next URL.

Configure the Supabase Auth redirect allowlist to include the application's callback URL. For local development, allow both `http://127.0.0.1:3000/auth/callback` and `http://localhost:3000/auth/callback`. Send invitations with `redirectTo` set to the callback. When using a token-hash email template, its link may be:

```text
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite
```

Existing invitations created with a redirect to `/` must be reissued with the corrected callback URL; their already-issued redirect target cannot be changed after sending.

---

## Session handling and Supabase clients

Use the existing `@supabase/ssr` integration and publishable key.

- Keep browser and server clients separate and based on the existing client factories.
- Add or update the Next.js 16 `proxy.ts` convention as appropriate to refresh Supabase auth cookies and perform an early redirect for protected page requests.
- Follow the installed Next.js/Supabase SSR guidance for cookie reads and writes; do not make cookie mutation inside a Server Component where the framework disallows it.
- Build a server-side data-access/auth helper that calls `supabase.auth.getUser()` and treats the returned verified user as authoritative. Do not use a cookie-decoded `getSession()` result alone to authorize server operations.
- Protected Server Components, Route Handlers, and Server Actions must independently require an authenticated user where they access private data or mutate it. Proxy checks improve navigation behavior but are not the security boundary.
- Ensure user-specific data access is not placed in a cross-user shared cache. If caching is later enabled, cache keys and invalidation must be scoped by authenticated user; this spec does not require adding caching.
- Do not expose or configure a Supabase service-role key in client bundles, browser code, normal server data access, or import actions. Use the publishable key with the verified user's session so RLS applies to every normal operation.

---

## Protected routes and unauthorized behavior

Require authentication for all application pages and actions that access measurement-related data, including:

```text
/
/measurements
/measurements/new
/measurements/[id]/edit
/measurements/trends
/measurements/import
```

Also protect any future or existing API/Route Handler endpoints that read or mutate these tables.

Keep `/sign-in` and required static assets public. Do not redirect static assets or Next.js internals through auth checks.

Behavior:

- Unauthenticated page navigation redirects to `/sign-in?next=<safe-internal-path>`.
- `next` must be validated as a same-origin relative path; reject protocol-relative and external URLs to prevent open redirects.
- Unauthenticated Server Actions/Route Handlers return an appropriate unauthenticated error/redirect response and perform no database mutation.
- If a user requests a measurement/profile/location ID they do not own, behave like a missing resource: use a not-found response/state and do not reveal whether another user's record exists.
- Invalid UUIDs, missing rows, and unauthorized rows must have safe, consistent behavior and must not bypass the database policies.
- Never rely on hiding links, selecting a profile in the UI, or supplying a user ID from the client as authorization.

---

## Supabase query and mutation changes

Update existing queries and mutations so they run through the authenticated SSR Supabase client with the user's cookies and are compatible with RLS.

- Remove assumptions that profiles or locations are global across all users.
- Scope selectors and profile lists to the current authenticated user's rows; RLS remains authoritative even if a query omits an explicit `.eq("user_id", ...)` filter.
- Create profile/location operations, if any are introduced elsewhere, must set ownership from verified server context or rely on `auth.uid()` as the database default; never accept ownership from form data.
- Measurement creation and import must validate that the target profile and location belong to the authenticated user. The database policy must independently enforce this relationship.
- Measurement history and trends must only return rows belonging to profiles owned by the current user.
- Edit and delete must not mutate a measurement outside the user's owned profile. Do not trust hidden IDs without database RLS checks.
- The import preview, duplicate lookup, and final insert must execute as the signed-in user. Preserve server-side revalidation and duplicate checking under RLS; do not use a privileged client to see other users' data.
- Supabase errors caused by RLS should produce safe user-facing not-found/unauthorized or retry messages and must not expose raw SQL or policy details.

---

## RLS enablement and policies

Enable RLS on all user-owned application tables:

```text
public.profiles
public.locations
public.measurements
```

Use `auth.uid()` in policies. Ensure required grants exist for the `authenticated` role and that `anon` cannot select or mutate these tables. Revoke broad default grants if necessary. RLS policies, not route filters, are the authorization source of truth.

### Profiles

- **SELECT:** allow a row only when `profiles.user_id = auth.uid()`.
- **INSERT:** allow only when the new row's `user_id = auth.uid()`; preferably set the column default to `auth.uid()` and omit it from client payloads.
- **UPDATE:** require both the existing row and resulting row to satisfy `user_id = auth.uid()`. Do not permit changing `user_id` to another user.
- **DELETE:** allow only rows where `user_id = auth.uid()`. Preserve existing foreign-key behavior or document any explicit account-deletion cascade.

### Locations

- **SELECT:** allow a row only when `locations.user_id = auth.uid()`.
- **INSERT:** allow only when the new row's `user_id = auth.uid()`; default to `auth.uid()` where appropriate.
- **UPDATE:** require both the existing and resulting row to belong to `auth.uid()`; prevent ownership transfer.
- **DELETE:** allow only when `user_id = auth.uid()`. Existing measurement references must continue to be protected by foreign-key behavior.

### Measurements

Measurements do not carry a direct `user_id`. Every policy must constrain ownership through `profiles`.

- **SELECT:** allow a measurement only if an associated profile exists with `profiles.id = measurements.profile_id` and `profiles.user_id = auth.uid()`.
- **INSERT:** require an owned related profile and an owned related location. For the location, require `locations.id = measurements.location_id` and `locations.user_id = auth.uid()`. Both checks must be true for the same `auth.uid()`.
- **UPDATE:** require the old row's profile and location to be owned by `auth.uid()` and require the resulting row's profile and location to remain owned by `auth.uid()`. Do not allow a user to move a measurement to another user's profile/location.
- **DELETE:** allow only when the related profile is owned by `auth.uid()`; also ensure the referenced location remains a valid owned location under the chosen same-owner invariant.

Use `USING` and `WITH CHECK` appropriately for update policies. Prefer small, auditable SQL predicates or narrowly scoped security-invoker helpers. Any helper used by policies must not introduce a privilege-escalation path, must have a fixed safe `search_path`, and must not bypass ownership checks. Do not mark security-definer functions casually.

RLS tests must verify both allowed access and denied cross-user access for each table and operation. Test direct Supabase/Data API operations, not only application UI behavior.

---

## Migration and existing-data behavior

The current development/reference records must be assigned to one explicitly designated initial owner during the controlled backfill. They must not be copied to every newly created user.

After ownership is established:

- all pre-auth records belong only to that initial owner
- a second user starts with no profiles, locations, or measurements
- no row remains with a NULL owner
- deleting or disabling an Auth user must follow the documented foreign-key/cascade policy and must not orphan rows
- migration rollback must not silently remove RLS or make data public; any recovery procedure must preserve the backup and keep access closed until repaired

Document a production cutover checklist: backup, initial user provisioning, ownership UUID verification, migration order, policy/grant verification, two-user isolation test, and reopening the application.

---

## Effects on historical import

The import workflow must continue to function without privileged database access:

- target profiles and locations are limited by RLS to the current user
- imported measurements are assigned to the verified user's owned profile and location
- no spreadsheet-provided owner/user ID is accepted
- preview duplicate lookup sees only the current user's measurements
- final server-side revalidation, duplicate recheck, and insert run under that user's session
- a crafted request containing another user's profile/location ID fails at RLS and inserts no rows
- one failed/unauthorized bulk insert must not partially import a batch
- duplicate matching must never disclose another user's measurements

No import format or parsing behavior changes are included in this phase.

---

## Automated tests

Add authentication- and authorization-sensitive tests while preserving the current suite.

Required coverage:

- sign-in success, invalid credentials, and safe redirect-path validation
- sign-out clears the session and returns to the sign-in route
- unauthenticated access to protected pages redirects to sign-in
- unauthenticated Server Actions perform no mutation
- invalid, missing, and cross-user resource IDs behave as not found without disclosing existence
- profile and location RLS SELECT/INSERT/UPDATE/DELETE isolation across at least two Auth users
- measurement RLS SELECT/INSERT/UPDATE/DELETE through owned profile and same-owner location
- attempts to forge `user_id`, use another user's profile, or attach another user's location are rejected
- ownerless rows cannot be exposed after enforcement
- create, history, edit/delete, trends, and import continue to function for the authenticated owner
- import duplicate lookup is isolated to the current owner, and unauthorized import inserts fail closed

Use local Supabase integration tests or a disposable test project for actual RLS policy behavior. Pure unit mocks may cover safe redirect parsing and auth-state presentation, but do not treat mocks as evidence that database policies work. Never run authorization tests against production data.

---

## Explicitly out of scope

This phase does not include:

- social/OAuth login providers
- password reset unless required for the basic auth flow
- email verification customization
- admin roles
- organization/team accounts
- sharing profiles between users
- billing
- charts changes
- import-format changes
- deployment
- profile/location management beyond ownership assignment required by migration
- medical interpretation
- unrelated refactors

---

## Acceptance criteria

The implementation is complete when all of the following are true:

1. Users can sign in and sign out with Supabase email/password authentication.
2. Authenticated sessions are refreshed and read using the installed Next.js/Supabase SSR conventions.
3. All measurement-related application pages, actions, and handlers require authentication.
4. Profiles and locations have a documented, enforced owner; measurements derive ownership through their related profile and require a same-owner location.
5. RLS is enabled and enforced on profiles, locations, and measurements, with correct SELECT, INSERT, UPDATE, and DELETE policies.
6. A user cannot read or mutate another user's profiles, locations, or measurements through UI, Server Actions, or direct Supabase requests.
7. Existing development data is assigned to one explicit initial account through a safe, documented migration/backfill; no data is silently dropped or shared with later users.
8. All current create, history, edit/delete, trends, and import flows continue to function under the authenticated user context and RLS.
9. The service-role key is never used for ordinary app requests or exposed client-side; RLS is not disabled as a workaround.
10. Automated tests cover auth-sensitive application behavior and actual two-user RLS isolation, and all existing tests remain green.
11. `DATABASE.md` and migration documentation reflect the implemented ownership model, policies, grants, and cutover requirements.
12. No explicitly out-of-scope feature or unrelated refactor is introduced.
