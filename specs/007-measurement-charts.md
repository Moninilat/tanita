# ============================================

# FILE: specs/007-measurement-charts.md

# ============================================

# SPEC-007: Measurement Trends and Charts

## Status

Complete

---

## Goal

Add a read-only trends view for reviewing historical measurements for one selected profile.

The view must display separate chronological charts for:

- weight
- body fat percentage
- muscle mass
- waist circumference

It must use real measurement data from Supabase, retain partial measurement history correctly, and never treat a missing value as zero.

This specification builds on the completed measurement history and edit/delete flows. It does not add or change measurement records.

---

## Required context

Read only:

- `AGENTS.md`
- `DATA_MODEL.md`
- `specs/005-measurement-history.md`
- `specs/006-edit-delete-measurement.md`
- existing measurement history and profile-selection source files

Inspect only the source files directly needed for this feature, especially:

- `app/measurements/page.tsx`
- `lib/measurements/history.ts`
- `app/page.tsx` for profile-selection conventions
- existing Supabase server-client/query infrastructure
- installed charting and test dependencies, if any

Consult `DATABASE.md` only if an exact persisted field name or database relationship creates a concrete ambiguity.

Do not read by default:

- `PROJECT.md`
- `README.md`
- `ROADMAP.md`
- unrelated specs

Do not inspect unrelated application code.

---

## Existing state

Already implemented:

- Next.js App Router application with Supabase server-side data access
- profile selection on the dashboard and measurement history page
- `/measurements` read-only measurement history
- `/measurements/[id]/edit` edit and delete flow
- centralized measurement domain and history behavior
- automated tests for measurement history, metric logic, and form validation

The application can already review, edit, and delete individual measurement records. This specification adds a separate read-only view for visualizing four raw metrics over time.

---

## Route and navigation

Create the trends page at:

```text
/measurements/trends
```

Use the existing `profile` query parameter to preserve profile selection:

```text
/measurements/trends?profile=<profile-id>
```

Keep the existing routes unchanged:

```text
/measurements
/measurements/new
/measurements/[id]/edit
```

Provide a clear link to the trends view from measurement history and a return link from trends to measurement history. Preserve the selected profile in both directions where practical. The charts themselves must not provide edit or delete actions.

---

## Profile selection

Reuse the measurement history page's profile-selection behavior and user-facing conventions.

- Load profiles from Supabase; do not hardcode a profile UUID.
- Use a valid requested `profile` query value when present.
- If exactly one profile exists, it may be selected automatically, as on history.
- When multiple profiles exist, provide the same profile selector and load charts only for the selected profile.
- An absent or invalid selection must not query or display another profile's measurements implicitly. Show a clear prompt to select a profile when there is no valid active selection.
- With no profiles, show an appropriate empty state and a path back to the dashboard or measurement history.

Changing the selected profile should navigate or submit using the `profile` query parameter and update all four charts together.

---

## Measurement data and chronology

Load historical rows for the selected profile from Supabase on the server. Retrieve only the fields needed for these charts:

```text
id
measured_at
weight_kg
body_fat_pct
muscle_mass_kg
waist_cm
```

Order rows by:

```text
measured_at ASC
id ASC
```

Charts display oldest to newest, so time reads left to right. `measured_at` is the measurement's chronology; do not use `created_at` or `updated_at`. Use `id` as the stable tie-breaker for rows with equal `measured_at` values.

Do not aggregate, average, or otherwise combine multiple measurements into a single date point. Measurements sharing a timestamp remain separate and deterministically ordered.

---

## Data-access and component structure

Prefer server-side loading for the profile and measurement rows. Keep Supabase query details out of chart presentation components.

A reasonable structure is:

```text
app/measurements/trends/page.tsx
lib/measurements/trends.ts
components/measurements/measurement-trends.tsx
```

Responsibilities:

- The route loads profiles, resolves the selected profile, loads that profile's chart fields, and handles query errors and empty states.
- A small reusable data helper may normalize/order chart input and shape it for rendering. It must preserve null metric values.
- A chart presentation component renders the four metric-specific trends and does not access Supabase directly.

Follow existing repository conventions and keep implementation limited to this feature. Reuse an already installed charting dependency if one exists. If none exists, choose an appropriate charting approach/library during implementation without adding a separate backend or broad visualization framework.

---

## Chart requirements

Render one distinct time-series chart for each metric:

| Metric | Persisted field | Unit |
| --- | --- | --- |
| Weight | `weight_kg` | kg |
| Body fat | `body_fat_pct` | % |
| Muscle mass | `muscle_mass_kg` | kg |
| Waist | `waist_cm` | cm |

Each chart must:

- have a clear metric title and unit on its value axis or equivalent labeling
- use `measured_at` for its horizontal time axis
- preserve the deterministic chronological order described above
- display measured values without changing persisted data
- make dates and values inspectable, such as through accessible labels, a tooltip, or an equivalent detail interaction
- avoid health classifications, targets, or interpretive annotations

Body-fat values are stored as percentage values (for example, `25.6` means `25.6%`). Do not convert them to fractions or label them as percentage-point changes; the charts show raw values, not deltas.

---

## Partial measurements and NULL behavior

A measurement may contain any subset of the charted metrics. For each metric, `NULL` means that metric was not recorded at that measurement.

Required behavior:

- Never convert `NULL`, `undefined`, or an absent metric to `0`.
- Do not plot a point for a missing metric value.
- Preserve the measurement timestamp and nullable value in the chart data model so the chart can represent a gap in that metric's series.
- Do not connect across missing observations in a way that implies a value was measured there. Configure the chart to leave a gap when the chosen charting tool supports this.
- Do not discard a measurement from another metric's timeline merely because the current charted metric is missing on that row.
- Keep valid zero values, if present in stored data, distinct from missing values; only nullish/non-finite values are unavailable for plotting.

A profile may have history rows but no non-null values for one or more charted metrics. In that case, render the chart heading and unit with a concise metric-specific empty state such as “No weight measurements recorded.” Do not render a fabricated flat zero series. If the selected profile has no history rows at all, show a page-level empty state instead of four misleading empty axes.

---

## Responsive layout and accessibility

The chart layout must work on desktop and mobile:

- use a two-column chart layout at wider viewport sizes when space allows
- stack charts in one column on narrow screens
- keep labels, axes, tooltips, and controls from clipping or overlapping
- provide an accessible name for every chart
- provide a text-accessible way to inspect plotted dates and values; do not rely on color alone to communicate data
- retain visible profile selection and navigation at mobile sizes

Use stable chart sizing so responsive resizing does not cause overlapping labels or controls.

---

## Loading, error, and empty states

The page must handle:

- no profiles
- multiple profiles with none selected
- a selected profile with no measurement history
- a selected profile with history but no values for a particular chart metric
- profile or measurement query failure

For query failures, show a clear page-level error rather than presenting partial or stale chart data as complete. Include a safe path back to measurement history.

---

## Read-only scope

This view must not mutate data.

Do not add:

- editing or deleting from chart points or chart menus
- update/delete server actions for this view
- health classifications or medical advice
- goals, target ranges, or success/failure states
- Excel/CSV import
- authentication or Row Level Security changes
- profile or location management
- unrelated refactors

---

## Automated tests

Add focused automated tests for the actual chart data transformation and route/data behavior where practical. Tests must include:

- chronological ordering by `measured_at` ascending with `id` ascending as the tie-breaker
- retention of timestamps for rows whose value is null for a given metric
- omission of missing values from plotted points without replacing them with zero
- preservation of valid values and correct field/unit association for all four metrics
- a metric with no non-null values producing an empty metric state rather than a zero series
- profile selection scoping chart rows to the selected profile, where the data-access boundary permits a focused test

Keep existing tests passing. Prefer pure data-helper tests for ordering and null handling and narrowly scoped route/query tests for profile scoping. Avoid tests that only assert a mocked function was called without checking transformed data or visible behavior.

---

## Acceptance criteria

The implementation is complete when all of the following are true:

1. A user can open `/measurements/trends` and select a profile using the existing history conventions.
2. The selected profile's historical measurements are loaded from Supabase.
3. Four read-only time-series charts display weight, body fat percentage, muscle mass, and waist circumference with appropriate units.
4. Charts use `measured_at` chronology, ordered oldest to newest, with deterministic handling of equal timestamps.
5. Partial measurements remain represented correctly; missing values are never shown or plotted as zero, and missing observations are not presented as measured continuity.
6. Charts and their date/value information remain usable on desktop and mobile and are accessible beyond color-only presentation.
7. Empty and query-error states are clear and do not imply missing data is zero.
8. No chart editing, deletion, health interpretation, targets, imports, auth, RLS, or unrelated behavior is introduced.
9. Automated tests cover transformation, ordering, and missing-value behavior, and the existing suite remains green.
