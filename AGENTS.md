# AGENTS.md

This file is binding for AI coding agents working in this repository.

## Required reading before architecture, database, or domain changes

1. Read PROJECT.md, DATA_MODEL.md, and DATABASE.md before making any architectural, database, or domain decision.
2. Read the relevant migration file and current schema documentation before changing database behavior.

## Database and schema rules

3. Do not change the database schema without creating a new migration.
4. Never edit an already-applied migration to represent future schema changes. Create a new migration instead.
5. Treat the implemented Supabase schema as the current source of truth for V1.
6. Keep raw measurements stored in the database and calculate derived metrics in application code.
7. NULL means missing data; do not use zero as a substitute.
8. Previous and first measurement calculations are metric-specific and must skip null values for that metric.
9. Percentage metrics must use percentage-point deltas, not relative percent change.
10. Do not introduce average weekly variation as a standard metric unless a product decision explicitly requires it.
11. Do not add a separate backend framework without explicit architectural approval.
12. Keep the current single-repository Next.js + Supabase architecture.
13. Never expose Supabase service-role credentials to browser or client code.
14. RLS is required before production. The current development-mode disabled state is not production-ready.
15. New database changes require: a migration, documentation update, and relevant tests.

## Product and engineering rules

16. Do not modify unrelated files.
17. Keep changes small, reviewable, and scoped to the task.
18. Run the available lint and relevant test commands before declaring implementation complete.
19. Do not calculate domain metrics directly inside React components.
20. Keep reusable body metric logic centralized.
21. Keep UI labels separate from persisted enum-like values.
22. Do not silently invent medical or health interpretation for Tanita values.
23. Keep the repository architecture simple: Next.js application logic and Supabase database access in the same project.
24. When working on measurement tracking, preserve the implemented semantics: raw values, metric-specific null skipping, and percentage-point deltas.

## Required behavior for new work

- Prefer small, isolated updates.
- If a change affects data semantics, update the related documentation at the same time.
- If a change affects the database, update the migration and the schema documentation.
- Preserve the current V1 measurement model and do not broaden the schema without a clear architecture decision.

## Safety reminders

- The current architecture is not split into separate frontend and backend repos.
- The project is not production-ready while RLS is disabled.
- The app should never assume that auth user equals body profile.
- Keep domain calculations in a shared layer such as lib/metrics/ rather than in UI code.
