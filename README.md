# Tanita Body Metrics Tracker

A single-repository body-composition tracking app for recording Tanita RD-545HR measurements and manual circumference values over time.

## What this project is

The application tracks:

- body metrics across time
- multiple profiles and measurement locations
- historical change analysis for each metric
- raw measurement storage with derived calculations performed in the application layer

The product is not a medical tool and does not assign health interpretation to Tanita values.

## Stack

- Next.js 16
- TypeScript
- React 19
- Tailwind CSS
- Supabase PostgreSQL
- Supabase CLI
- Vercel for later deployment

## Architecture overview

This repository keeps the application in one place:

```text
Next.js + TypeScript
    |
    +-- UI
    +-- server-side app logic
    +-- domain logic
    +-- Supabase access
    v
Supabase PostgreSQL
```

There is no separate Express or FastAPI backend in this repository. The frontend and backend application concerns live in the same Next.js project.

## Current development status

The project is in active development and has already completed the initial V1 foundation:

- requirements and domain model defined
- project documentation created
- initial Supabase schema created and published
- profile, location, and measurement tables present in the remote project
- initial migration already applied
- Next.js initialized in the same repository
- frontend/backend Supabase integration is still pending

This project is not production-ready while RLS is disabled and authentication has not yet been implemented.

## Repository structure

```text
.
├── app/
├── public/
├── supabase/
│   ├── config.toml
│   └── migrations/
│       └── 001_initial_schema.sql
├── AGENTS.md
├── CLAUDE.md
├── DATA_MODEL.md
├── DATABASE.md
├── PROJECT.md
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.ts
├── next-env.d.ts
├── postcss.config.mjs
├── eslint.config.mjs
└── .gitignore
```

## Prerequisites

Before running the project locally, install:

- Node.js
- npm
- the Supabase CLI

You will also need a local or remote Supabase project that is configured for the repo.

## Install

```bash
npm install
```

## Run the app locally

```bash
npm run dev
```

Then open http://localhost:3000.

## Supabase CLI context

This repository contains Supabase configuration and migrations under the supabase/ directory.

Common workflow:

```bash
supabase login
supabase status
supabase db push
```

The project is already linked to the remote Supabase project and the initial migration has been applied.

## Migrations

The migration directory is:

```text
supabase/migrations/
```

The current migration is:

```text
supabase/migrations/001_initial_schema.sql
```

Database changes should be made with new migrations. Do not modify an already-applied migration file in place.

## Applying migrations

Use the Supabase CLI to apply schema changes:

```bash
supabase db push
```

If you are working with local development and need to inspect the database state, use the Supabase CLI and local tooling as appropriate.

## Important security warning

The current Supabase database has RLS disabled during development.

This is acceptable only while the project is under active local development. The application is not production-ready until:

- Supabase Auth is implemented
- ownership and access rules are designed
- Row Level Security is enabled
- explicit access policies are created
- safe environment-variable handling is enforced

Do not place service-role credentials, database passwords, private keys, or secret values in documentation or source files.

## Documentation

Key project documents:

- [PROJECT.md](PROJECT.md)
- [DATA_MODEL.md](DATA_MODEL.md)
- [DATABASE.md](DATABASE.md)
- [AGENTS.md](AGENTS.md)

These files define the architecture, the domain model, the implemented V1 schema, and the engineering rules for working in the repository.
