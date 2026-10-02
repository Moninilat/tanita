# Active context

## Current project baseline

The repository is currently in a working state with the main functional areas implemented and validated by the existing suite.

Current evidence from the repo and verification commands:

- `npm test` passes in the current workspace.
- `npm run lint` passes in the current workspace.
- `npm run build` passes in the current workspace.
- Integration-style RLS/auth tests exist but remain environment-gated for local Supabase.

## Current state of implemented functionality

The app currently includes:

- authenticated access for protected pages;
- dashboard summaries for core body metrics;
- measurement history listing and editable detail views;
- measurement creation, update and delete flows;
- trend visualizations for selected metrics;
- historical CSV/XLSX import with validation and duplicate checks;
- shared primary navigation across all six measurement views, with profile-aware internal links and accessible current-view state;
- profile and location ownership enforced in the data layer.

## Recent decisions that matter

- Missing values remain `null` instead of being treated as zero.
- Derived metric logic is centralized and not duplicated in components.
- Ownership is enforced in the data model rather than in the UI.
- Importing historical rows is structured as a validation-preview-commit flow, not a direct insert.
- Internal redirect targets are sanitized before redirecting.
- Shared navigation reuses the existing sign-out control; page-level profile resolution remains responsible for which profile context is passed to navigation.

## Risks and considerations

- Any change touching auth, RLS, profiles, locations or measurement access should re-check the ownership rules and the SQL policies.
- Any change touching history, trends or dashboard calculations should re-check the metric logic and the related tests.
- The local Supabase integration environment is not guaranteed to be active in all environments.

## Immediate focus

SPEC-010 implementation is complete except for manual keyboard and narrow-viewport verification, which still needs an authenticated browser session. The important context for future sessions is: keep the rule layer in `.agents/rules/`, and use this memory-bank for project state, recent decisions and implementation status.
