# Progress

## Completed

### Measurements
- measurement schema and validation are implemented;
- measurement creation, update and deletion flows exist;
- measurement data supports partial values and nullable metric fields.

### History and dashboard
- dashboard summaries are implemented for key body metrics;
- history pages render measurement records and details;
- metric summaries and deltas are computed from ordered history.

### Trends
- trend pages and metric series generation are implemented for core metrics.

### Historical import
- CSV and XLSX parsing are implemented;
- column mapping, validation and preview are supported;
- duplicate detection and explicit override handling are part of the import flow;
- batch commit is implemented with `entry_method: "import"`.

### Authentication and ownership
- Supabase auth and protected route handling are present;
- invitation callback and password setup flows exist;
- ownership-by-user policies are present for profiles, locations and measurements.

### Documentation layer
- `AGENTS.md` is now a project entry point and rule index;
- `.agents/rules/` contains the domain-specific normative rules.
- the memory-bank captures persistent project state and decisions.

## In progress

- repository-wide memory/context maintenance for cross-session continuity.

## Pending

- follow-up work that is not yet represented in the current codebase should be tracked as task-specific work, not assumed here.

## Known issues or caveats

- auth/RLS integration tests remain environment-dependent on local Supabase variables;
- the project baseline currently uses code and tests as the final source of truth for implementation status;
- documentation should be updated only when the code or operational state changes materially.
