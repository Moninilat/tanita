# Tanita Body Metrics Tracker

## Product goal

This project tracks body-composition measurements from a Tanita RD-545HR and manual circumference measurements over time. The product stores raw observation data and computes derived values such as body fat mass, BMI, waist-to-hip ratio, and change from the first or previous non-null measurement.

The system is designed for personal tracking across one or more profiles, with emphasis on historical consistency and metric-specific comparisons rather than medical interpretation.

## V1 scope

V1 focuses on the core measurement workflow:

- a single-repository Next.js application
- Supabase PostgreSQL as the data layer
- profiles and locations
- measurement records with metadata and body metrics
- derived metric calculations from stored raw values
- historical import of spreadsheet data
- dashboard and history views for core metrics

## Architecture

This repository keeps the application and the data-access layer together in one Next.js project.

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
├── ROADMAP.md
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── package.json
├── next.config.ts
├── tsconfig.json
└── other Next.js configuration files
```

Application architecture:

```text
Next.js + TypeScript
    |
    +-- UI
    +-- server-side application logic
    +-- domain logic
    +-- Supabase access
    v
Supabase
    |
    v
PostgreSQL
```

This is intentionally not split into separate frontend and backend repositories.

## Technology stack

- Next.js
- TypeScript
- React
- Tailwind CSS
- Supabase PostgreSQL
- Supabase CLI
- Vercel for later deployment

## Repository structure

- app/: Next.js application code
- public/: static assets
- supabase/: Supabase configuration and migrations
- PROJECT.md: stable product and architecture description
- DATA_MODEL.md: domain semantics and calculation rules
- DATABASE.md: implemented database schema and future schema decisions
- ROADMAP.md: implementation progress and planned phases
- README.md: human-oriented onboarding notes
- AGENTS.md: AI routing and guardrails
- CLAUDE.md: concise agent instructions

## Architectural principles

1. Keep the application in one repository.
2. Store raw measurements and calculate derived values from them.
3. Centralize reusable metric logic instead of calculating in UI components.
4. Treat NULL as missing data, not zero.
5. Use metric-specific previous and first measurement logic that skips nulls.
6. Use percentage-point deltas for percentage metrics.
7. Keep persisted values separate from user-facing labels.
8. Do not silently assign medical meaning to Tanita values.
9. Do not expose service-role credentials to browser code.
10. Keep the design ready for future auth and RLS work without treating it as production-ready yet.

## Out-of-scope items for V1

- separate frontend and backend repositories
- separate Express, Node API, or FastAPI backend
- monorepo tooling such as Turborepo or Nx
- RD-545HR segmental metrics
- device metadata table
- production authentication and production RLS

## Definition of V1 success

V1 is successful when the application can record measurements for a profile and location, preserve raw observations, calculate metric-specific change values, support historical review, and operate under the current single-repository Next.js + Supabase architecture.

Implementation progress and near-term roadmap details live in ROADMAP.md.