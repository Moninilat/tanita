# Tanita Body Metrics Tracker

## Project goal

Tanita is a body-composition tracking application for monitoring measurements from a Tanita RD-545HR and manual circumference measurements over time. The system stores raw observations, keeps a chronological history, and calculates derived values such as body fat mass, waist-to-hip ratio, BMI, and change from the first or previous non-null measurement.

The product is designed for personal tracking across one or more profiles, with a focus on accurate historical analysis rather than medical interpretation.

## V1 scope

V1 is intentionally limited to the core measurement workflow:

- one repository containing the full application stack
- Next.js as the application framework
- Supabase PostgreSQL for the hosted database
- profile and location records
- measurement history with metadata and body metrics
- derived metric calculations from stored raw data
- measurement import workflow for historical records
- dashboard and history views for core metrics
- no production authentication or RLS enforcement yet

## Architecture

This project uses a single full-stack repository and keeps frontend and backend application concerns in the same Next.js project.

```text
Tanita repository
├── app/                         # Next.js App Router application
├── public/
├── supabase/
│   ├── config.toml
│   └── migrations/
│       └── 001_initial_schema.sql
├── PROJECT.md
├── DATA_MODEL.md
├── DATABASE.md
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── package.json
├── next.config.ts
├── tsconfig.json
└── other Next.js configuration files
```

The application architecture is intentionally simple:

```text
Next.js + TypeScript
    |
    +-- UI
    +-- server-side application logic
    +-- domain logic
    |
    v
Supabase
    |
    v
PostgreSQL
```

This is not a split frontend/backend monorepo. It is one Next.js application that may include React UI, server-side logic, domain logic, and Supabase access code as needed.

## Technology stack

- Next.js 16 App Router
- TypeScript
- React 19
- Tailwind CSS
- Supabase PostgreSQL
- Supabase CLI
- Vercel for deployment later

## Repository structure

- app/: Next.js application code
- public/: static assets
- supabase/: Supabase configuration and migrations
- PROJECT.md: core product and architecture definition
- DATA_MODEL.md: domain semantics and metric rules
- DATABASE.md: implemented V1 schema documentation
- README.md: onboarding and project overview
- AGENTS.md: rules for AI coding agents
- CLAUDE.md: concise agent instructions

## Architectural principles

1. Keep the application in a single repository.
2. Store raw measurements; calculate derived metrics dynamically.
3. Keep reusable metric logic centralized instead of embedding formulas in React components.
4. Treat null as missing data, not zero.
5. Use metric-specific previous and first measurement logic that skips nulls.
6. Use percentage-point deltas for percentage metrics.
7. Do not invent health interpretation or medical guidance from Tanita values.
8. Keep UI labels and persisted enum-like values separate.
9. Never expose Supabase service-role credentials to client code.
10. Keep the architecture ready for future auth and RLS work without pretending it is complete yet.

## Current implementation status

The following items are already implemented and should be considered part of the current project baseline:

- the application requirements have been defined
- PROJECT.md exists
- DATA_MODEL.md exists
- DATABASE.md exists
- the confirmed body-composition device is the Tanita RD-545HR
- the database model is designed around profiles, locations, and measurements
- derived metrics are intentionally not stored as raw database columns
- the Supabase CLI has been installed and configured
- Supabase has been initialized in the repository
- the local repository is linked to the remote Supabase project
- the initial migration exists at supabase/migrations/001_initial_schema.sql
- the initial migration has been successfully pushed to the remote Supabase PostgreSQL database
- the remote database currently contains profiles, locations, and measurements
- foreign keys and database constraints are active
- profile deletion uses ON DELETE RESTRICT
- location deletion uses ON DELETE RESTRICT
- updated_at is maintained automatically by PostgreSQL triggers
- location names are unique case-insensitively using lower(trim(name))
- measurement chronology indexes exist for profile and location ordering
- the database constraints have been manually tested through the Supabase Table Editor
- a real test profile and location exist in the development database
- two reference measurements exist for the same profile:
  - 2026-09-01: 55.050 kg
  - 2026-09-11: 53.800 kg
- Next.js was created in the same repository using the root app/ directory
- npm dependencies have been installed
- frontend/backend integration with Supabase has not yet been implemented

## Completed milestones

### Milestone 1: Requirements and data model

The product requirements, domain semantics, and measurement model were defined around the Tanita RD-545HR and manual measurement workflow.

### Milestone 2: Database schema and migrations

The initial V1 schema was designed and implemented in the repository, deployed to Supabase, and includes core constraints, indexes, and triggers.

### Milestone 3: Initial measurement fixture data

Reference data was inserted to validate the metric engine assumptions and the change-from-start / change-from-previous logic.

### Milestone 4: Next.js project initialization

A Next.js project was created in the same repository and configured for the current application.

## Current phase

Current immediate phase:

Phase 4 - Supabase application integration

This phase is still pending. The next technical step is to connect Next.js to Supabase using a safe configuration and the appropriate browser/server clients, without exposing privileged credentials.

## Roadmap / next phases

### Phase 4 - Supabase application integration

- install the Supabase JavaScript client if needed
- configure environment variables safely
- create browser and server clients as appropriate
- never expose the service-role key to client code
- verify Next.js can read development data from Supabase
- create TypeScript database and domain types

### Phase 5 - Domain metric engine

Create centralized metric calculations in a shared domain location such as lib/metrics/.

Implement and test:

- body fat mass
- waist-to-hip ratio
- BMI
- change from first non-null measurement
- change from previous non-null measurement

Use the existing two weight measurements as the initial regression case:

- 55.05 -> 53.80
- expected change from start = -1.25
- expected change from previous = -1.25

### Phase 6 - Tests

Add unit tests covering multiple measurements, nulls between measurements, single-measurement behavior, no previous measurement, percentage-point calculation, historical insertion, historical edits, and deletion effects.

### Phase 7 - Measurement form

Build the measurement form for:

- profile selection
- date/time
- location
- Tanita metrics
- manual circumference metrics
- notes

The form must ensure at least one body metric exists and should use controlled entry_method values such as manual or import.

### Phase 8 - Dashboard

Display key metrics such as weight, body fat percentage, body fat mass, muscle mass, waist, and waist-to-hip ratio, each with current value and change from start / previous measurement.

### Phase 9 - History

Create measurement history with filters, edit workflows, deletion, profile filtering, and location filtering.

### Phase 10 - Charts

Add historical charts for selected metrics.

### Phase 11 - Historical Excel import

Create a controlled import process for spreadsheet data, converting each historical date into a measurement row with entry_method = import and validating against historical Excel values.

### Phase 12 - Authentication and security

This is not implemented yet. Current tables have RLS disabled for development, which is acceptable only in local development. Before production:

- implement Supabase Auth
- define ownership and access relationships
- enable Row Level Security
- create explicit RLS policies
- avoid assuming auth user = body profile
- allow one authenticated account to access multiple profiles if needed

### Phase 13 - Deployment

Later:

- deploy Next.js to Vercel
- configure production-safe environment variables
- set up production Supabase access
- verify security policies
- validate the mobile experience
- establish backup and export strategy

## Out-of-scope items for V1

The following are explicitly outside the initial V1 scope:

- separate frontend/backend repositories
- separate Express, FastAPI, or Node API backend
- separate monorepo tooling such as Turborepo or Nx
- segmental Tanita metrics
- device metadata table
- historical height snapshots
- broad medical interpretation of Tanita values
- production authentication or production RLS

## Definition of V1 success

V1 is successful when the application can:

- capture a measurement for a profile and location
- store Tanita and manual metric values without forcing every field to be populated
- calculate metric-specific current values and changes from first/previous non-null observations
- show a useful measurement history and dashboard
- support import of historical spreadsheet data in a controlled workflow
- run in a single-repository Next.js + Supabase architecture
- be safely prepared for auth and security work before production deployment

The project is not production-ready while RLS is disabled and authentication is not implemented.