# AGENTS.md

This file is the default routing and guardrail document for this repository.

## Required behavior

- Always read AGENTS.md first.
- Read the active spec for the task.
- Read only the task-specific reference docs.
- Never preload all documentation by default.
- Keep changes narrow and reviewable.

## Routing model

- Architecture: PROJECT.md + active spec
- Domain/calculations: DATA_MODEL.md + active spec
- Database/migrations: DATABASE.md + relevant migration + active spec
- Supabase queries/integration: DATABASE.md + active spec
- UI-only work: active spec only, plus relevant source files
- Historical import: DATA_MODEL.md + DATABASE.md + active spec
- Auth/RLS: DATABASE.md + active security spec

## Hard rules

- Keep the single-repository Next.js + Supabase architecture.
- Do not add a separate backend framework without explicit approval.
- Raw measurements stay in the database; derived metrics are calculated in code.
- NULL means missing data; never treat it as zero.
- Previous and first measurement calculations are metric-specific and skip null values for that metric.
- Percentage metrics use percentage-point deltas, not relative percent change.
- Keep reusable metric logic centralized instead of calculating in React components.
- Keep UI labels separate from persisted enum-like values.
- Never expose a service-role credential to browser code.
- RLS is required before production; development-mode disabling is not production-ready.
- Do not modify unrelated files.
- If a database change is needed, add a migration, update the relevant docs, and include the relevant validation.
- Do not silently invent medical or health interpretation for Tanita values.

## Active-spec usage

The active spec is the task source of truth for scope and acceptance criteria. Read the spec first and then only the minimal set of references required to complete that scope. Do not read PROJECT.md, DATA_MODEL.md, DATABASE.md, README.md, or roadmap documents by default unless the task specifically requires them.
