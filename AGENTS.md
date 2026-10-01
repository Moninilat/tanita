# AGENTS.md

This file is the repository entry point and operating guide. It is intentionally short and high-level. The detailed working rules live in `.agents/rules/` and the code, tests, and migrations remain the source of truth.

## Project

This repository is a Next.js + Supabase application for tracking body measurements and derived health metrics. The app supports:

- authenticated profiles;
- measurement history and editing;
- trend and dashboard summaries;
- CSV/XLSX historical import;
- Supabase Auth and ownership-based access control.

The important product rule is that body data is tracked as partial measurements, and missing values remain `null` rather than being silently converted to zero.

## Stack and structure

- Framework: Next.js 16.3.5
- React: 19.2.8
- TypeScript: 5.x
- Package manager: npm
- Backend and auth: Supabase
- CSV/XLSX parsing: Papa Parse + ExcelJS
- Testing: Vitest
- Linting: ESLint
- Styling: Tailwind CSS

Key folders:

- `app/`: routes and server pages
- `components/`: reusable UI and client-side form controls
- `lib/`: business logic, auth helpers, validation, calculations, imports, Supabase access helpers
- `supabase/`: DB schema and RLS policies
- `tests/`: project behavior checks and regressions
- `.agents/rules/`: module-specific rules that agents must review before making changes

## Commands

Use only the commands that actually exist in this repository:

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm test`

Use a targeted Vitest command when the change is limited to one area, for example:

- `npx vitest run tests/measurement-validation.test.ts`
- `npx vitest run tests/measurement-import-actions.test.ts`
- `npx vitest run tests/auth-rls.integration.test.ts` (only when the local Supabase environment is available)

## Conventions

General conventions that are already visible in the repo:

- `null` means "missing data"; it is not the same as zero.
- Metric logic is centralized in `lib/metrics` and dashboard helpers, not duplicated across components.
- Form and server validation are treated as the source of truth; UI validation alone is not enough.
- Server Components fetch data; Client Components handle form interaction and call Server Actions.
- Measurement dates are stored as a combined local date/time value when needed.
- Ownership and RLS are part of the data model, not a UI add-on.

## Memory Bank

This repository also includes a persistent project context under `memory-bank/`. Use it to understand the current state, technical decisions and implementation status across sessions.

The Memory Bank stores project context and working state. The rule layer remains in `.agents/rules/` and the code/test suite remain the source of truth for normative behavior.

## Rules of domain

Before working on any module, review the applicable rule file below.

| Area | Rule file |
|---|---|
| Measurement domain | `.agents/rules/measurement-domain.md` |
| Auth and ownership | `.agents/rules/auth-and-ownership.md` |
| Historical import | `.agents/rules/historical-import.md` |
| Metric calculations | `.agents/rules/metric-calculations.md` |
| Server actions and UI | `.agents/rules/server-actions-and-ui.md` |

## Working flow

Before changing any module, whether frontend or backend:

1. Identify the affected module and the relevant rule file.
2. Review the implementation plus the matching tests.
3. Confirm whether the change touches auth, ownership, data access, validation, or import logic.
4. Make the smallest possible change.
5. Update or add tests when behavior changes.
6. Run the relevant verification commands.

After a significant implementation or modification, update the relevant files in `memory-bank/` so they reflect the real project state. Do not update the Memory Bank for trivial changes or document work that is not yet present in the code.

If a rule changes about how something should be implemented, update `.agents/rules/` first. If the project state, context or progress changes, update `memory-bank/`.

This project is not designed for broad changes without checking the corresponding domain rules and the protected data paths.

## Limits

The following limits are enforced by the current code and tests:

- Do not bypass authentication or ownership checks.
- Do not treat missing metric values as zero.
- Do not duplicate metric logic across components when the repository already centralizes it.
- Do not rely on client-side validation as the only protection.
- Do not introduce unsafe internal redirects.
- Do not modify migration history casually; treat the schema as append-only unless the task explicitly requires a migration change.
- Do not assume a frontend-only fix when the change affects data, auth, or import flows.

## Verification

Verification depends on the scope of the change.

- Small UI or local logic change: `npm run lint` and the relevant Vitest file.
- Functional change: run the relevant module tests, then the full `npm test` if the change crosses multiple behaviors.
- Auth, ownership or RLS change: verify the auth and RLS-related tests and review the matching Supabase policy files.
- Cross-cutting change: run `npm run lint`, then `npm test`, and then `npm run build` when the change affects production-facing routes or server logic.

## Notes

- The code and tests in this repo are the primary source of truth.
- `.agents/rules` should be treated as a required review layer for any module-level change.
- This document intentionally avoids repeating detailed domain rules that are already documented in the rule files.


