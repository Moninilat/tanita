# Project brief

This repository is a Next.js + Supabase application for tracking body measurements over time. It is designed for authenticated users who manage one or more profiles and record multiple body metrics such as weight, body fat, muscle mass, and circumference measurements.

The product’s core problem is simple but data-sensitive: keep historical body measurements for a user, make the data easy to review, and preserve the semantic meaning of missing values. The app supports dashboard summaries, measurement history, trends, editing and deletion, and import from CSV/XLSX files.

The current scope includes:

- profile-based measurement tracking;
- measurement history and detail pages;
- dashboard metric summaries;
- trend charts by selected metric;
- historical import with validation and duplicate handling;
- Supabase Auth flows with invitation and password setup;
- ownership-bound data access via RLS.

Current limits are also visible in the codebase:

- the app is centered on a single repository and Supabase backend rather than a separate service layer;
- the integration/auth tests depend on a local Supabase environment;
- the repo does not define a separate backend runtime or task runner beyond Next.js and Supabase.

The rule layer for design constraints remains in `AGENTS.md` and `.agents/rules/`; this file is only the stable project summary.
