# CLAUDE.md

Treat AGENTS.md as binding.

Before changing architecture, data, or database behavior:

- read PROJECT.md for current architecture and status
- read DATA_MODEL.md for domain semantics and calculation rules
- read DATABASE.md and the relevant migration before modifying database design

Keep the project in the current single-repository Next.js + Supabase architecture. Prefer small, scoped changes and avoid unrelated refactors.

When reporting back, include:

- files changed
- validation performed
- any follow-up risks or open decisions

Do not assume production readiness while RLS remains disabled or authentication is still pending.
