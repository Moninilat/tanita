# CLAUDE.md

Treat AGENTS.md as binding.

Follow the active spec and read only the docs needed for that task. Do not read every Markdown file by default.

Before changing architecture, data, or database behavior, read:

- AGENTS.md
- the active spec
- the relevant task-specific reference documents only

Keep the current single-repository Next.js + Supabase architecture, prefer small scoped changes, and avoid unrelated refactors.

When reporting back, include:

- files changed
- validation performed
- follow-up risks or open decisions

Do not assume production readiness while auth and RLS remain pending.
