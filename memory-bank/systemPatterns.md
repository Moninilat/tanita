# System patterns

## Architectural pattern

The repository follows a Next.js App Router pattern with distinct responsibilities by folder:

- `app/` holds route pages and server components;
- `components/` holds UI-focused React components;
- `lib/` holds logic for auth, validation, calculations, imports and Supabase access helpers;
- `supabase/` holds schema and DB policies;
- `tests/` captures behavior-level regression coverage.

## Server and client split

A clear pattern is already established:

- server pages fetch and protect query data;
- client components handle form interaction and action feedback;
- server actions perform writes and validation; 
- the browser does not become the authority for ownership or data access.

This is visible in the measurement form flow and the auth flow.

## Data and validation patterns

- validation is centralized in `lib/measurements/validation.ts` and related modules;
- metric calculations are centralized in `lib/metrics/` instead of duplicated in UI code;
- `null` is treated as an absence signal, not as a numeric value;
- database constraints and RLS provide the final protection boundary.

## Integration pattern

Supabase is the system backend for:

- Auth;
- Postgres tables;
- RLS policies;
- SSR clients and browser clients via `@supabase/ssr`.

The proxy layer in `proxy.ts` and `lib/supabase/proxy.ts` routes unauthenticated users to sign-in while preserving the internal `next` target.

## Import pattern

The historical import flow splits responsibilities into parse, validate, preview, duplicate detection and commit stages. This is intentionally more structured than a single bulk insert operation.

## Stability note

This file describes how the system is currently organized. The normative rules remain in `.agents/rules/`.
