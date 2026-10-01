# Technical context

## Current stack

The application currently uses:

- Next.js 16.3.5
- React 19.2.8
- TypeScript 5.x
- npm scripts defined in `package.json`
- Supabase Auth + Postgres + RLS
- Tailwind CSS
- Vitest for tests
- ESLint for linting
- Papa Parse for CSV parsing
- ExcelJS for XLSX parsing

## Data and auth infrastructure

The repo uses Supabase for both authentication and database access. The schema and policies are stored in `supabase/migrations/` and are the authoritative reference for ownership and authorization behavior.

The RLS migration set currently includes:

- `001_initial_schema.sql`
- `002_rls_lockdown.sql`
- `003_auth_ownership_policies.sql`

These define the key ownership and authorization model for profiles, locations and measurements.

## Tooling and scripts

The scripts in `package.json` are the actual project baseline:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm test`

There is no explicit `typecheck` script in the package manifest, so TypeScript validation is effectively tied to the editor and build path rather than a dedicated npm command.

## Environment caveat

The integration tests for auth and RLS are conditional on local Supabase environment variables; they are skipped when the required local environment is not present. This is a project-specific environment constraint and should be tracked in context rather than assumed to be fully active in every environment.

## Known dependencies and limits

- The app depends on real Supabase infrastructure for auth and user-scoped data access.
- Import capabilities depend on CSV/XLSX parsing libraries already included in the repo.
- The project is intentionally lean: no separate backend framework or service layer is present beyond Next.js and Supabase.
