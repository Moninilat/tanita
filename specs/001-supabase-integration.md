# SPEC-001: Supabase integration

## Status

Complete.

## Goal

Connect the existing Next.js application to the already-configured Supabase project and verify that application code can read the reference measurement rows without implementing metric calculations, auth, RLS, or dashboard features yet.

## Required context

- AGENTS.md
- specs/001-supabase-integration.md
- DATABASE.md

The following documents should not be read unless a concrete ambiguity requires them:

- DATA_MODEL.md
- PROJECT.md
- README.md
- ROADMAP.md

## Existing state

- Next.js app exists in the root-level app/ directory
- the Supabase project already exists
- the repository is already linked through the Supabase CLI
- the initial schema migration has already been applied
- profiles, locations, and measurements exist
- the development database contains two reference weight measurements:
  - 2026-09-01: 55.050 kg
  - 2026-09-11: 53.800 kg
- application-level Next.js/Supabase integration has not been implemented

## Requirements

- install the required Supabase JavaScript packages
- configure environment variables safely
- create reusable browser/server Supabase client infrastructure as appropriate
- never expose a service-role credential to browser code
- verify application code can read measurements
- order measurements by measured_at
- do not implement metric calculations yet
- do not implement auth/RLS yet
- do not build dashboard UI yet

## Acceptance criteria

- the application can retrieve the two existing test measurements ordered as:
  - 2026-09-01 -> 55.050
  - 2026-09-11 -> 53.800
- no secrets are committed
- lint passes

## Out of scope

- metric calculation logic
- authentication and Row Level Security
- dashboard UI
- dashboard metric summaries
- any schema changes

## Expected files

- app/
- environment variable configuration files if required by the project setup
- any small shared Supabase client utilities created for the application
