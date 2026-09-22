# Tanita Body Metrics Tracker

A personal body-composition tracker for logging Tanita measurements and manual circumference values over time.

## What this project is

The application keeps a history of body measurements and supports comparison across time. It focuses on raw data capture, clean historical ordering, and derived metric calculations based on that raw data.

## Stack

- Next.js
- TypeScript
- React
- Tailwind CSS
- Supabase PostgreSQL
- Supabase CLI

## Architecture overview

This repository keeps the application in one place:

```text
Next.js + TypeScript
    |
    +-- UI
    +-- server-side application logic
    +-- domain logic
    +-- Supabase access
    v
Supabase PostgreSQL
```

The project intentionally uses a single repository rather than separate frontend and backend services.

## Setup

### Prerequisites

- Node.js
- npm
- the Supabase CLI

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Then open http://localhost:3000.

## Supabase context

This repository contains the Supabase configuration and migration files under the supabase directory.

Common workflow:

```bash
supabase login
supabase status
supabase db push
```

The migration directory is:

```text
supabase/migrations/
```

The initial migration is:

```text
supabase/migrations/001_initial_schema.sql
```

## Important security note

The current Supabase database has RLS disabled during local development. This is acceptable only during development and not in production.

The application is not production-ready until:

- Supabase Auth is implemented
- access rules are designed
- Row Level Security is enabled
- explicit policies are created
- environment variables are handled safely

Do not commit database passwords, private keys, or service-role credentials.

## Project documentation

- [PROJECT.md](PROJECT.md)
- [DATA_MODEL.md](DATA_MODEL.md)
- [DATABASE.md](DATABASE.md)
- [AGENTS.md](AGENTS.md)
- [ROADMAP.md](ROADMAP.md)

This repo is intentionally documentation-light at the top level, and agent routing is handled by AGENTS.md instead of by requiring broad reads of every Markdown file.
