# ============================================
# FILE: specs/004-dashboard.md
# ============================================

# SPEC-004: Dashboard

## Status

Complete

---

## Goal

Build the first dashboard for viewing current body metrics and their changes over time.

The dashboard must use:

- real measurement data from Supabase
- the reusable metric engine implemented in SPEC-002

The dashboard must not reimplement metric calculations inside React components.

This specification covers summary cards only.

It does not include:

- charts
- full measurement history
- editing measurements
- deleting measurements
- authentication
- Row Level Security
- Excel import

---

## Required context

Read only:

- `AGENTS.md`
- `specs/004-dashboard.md`
- `DATA_MODEL.md`

Then inspect only the source files directly needed for this task, especially:

- existing dashboard/root page
- `lib/metrics/`
- existing Supabase server client/query infrastructure
- relevant shared UI components, if any

Do not read by default:

- `PROJECT.md`
- `DATABASE.md`
- `README.md`
- `ROADMAP.md`
- `specs/001-supabase-integration.md`
- `specs/002-metric-engine.md`
- `specs/003-measurement-form.md`

Consult `DATABASE.md` only if an exact persisted field name creates a concrete ambiguity.

Do not inspect unrelated application code.

---

## Existing state

Already implemented:

- Next.js application
- Supabase integration
- server-side access to measurement data
- centralized metric engine
- body-fat mass calculation
- waist-to-hip ratio calculation
- BMI calculation
- generic metric-history summaries
- measurement creation form
- automated tests for metric calculations and measurement validation

The root page currently contains development or temporary output from earlier Supabase verification.

This spec replaces that temporary output with the first real dashboard.

---

## Dashboard scope

V1 dashboard summary metrics:

1. Weight
2. Body fat
3. Body fat mass
4. Muscle mass
5. Waist
6. Waist-to-hip ratio

Do not add more dashboard metrics in this spec.

BMI exists in the metric engine but is not required on this first dashboard.

---

## Profile selection

The dashboard must show data for one selected profile.

### Required behavior

Load existing profiles from Supabase.

If there is only one profile, the dashboard may automatically select it.

If there are multiple profiles, provide a simple way to choose the active profile.

The implementation should avoid hardcoding a profile UUID.

The selected profile must determine which measurement history is loaded.

Do not implement profile creation or editing here.

---

## Measurement query

For the selected profile, load the measurement history required to calculate the dashboard metrics.

Chronological semantics must follow `DATA_MODEL.md`.

Use:

1. `measured_at`
2. `id` as deterministic tie-breaker when needed

Do not use `created_at` to determine measurement history.

The dashboard should have enough historical data to calculate:

- current
- first
- previous
- change from first
- change from previous

for each displayed metric.

---

## Metric engine reuse

All historical summaries must reuse the existing metric engine from SPEC-002.

Do not duplicate logic such as:

```text
current - first
```

or:

```text
current - previous
```

inside React components.

Do not independently implement null-skipping behavior in dashboard components.

The metric engine remains the source of truth for these calculations.

---

## Dashboard metric semantics

Each metric card should display, where available:

```text
Current value
Change from start
Change from previous
```

### Example

```text
Weight

53.80 kg

From start
-1.25 kg

From previous
-1.25 kg
```

The exact visual layout may differ.

---

## 1. Weight

Source field:

```text
weight_kg
```

Display unit:

```text
kg
```

Use metric-history summary behavior from the metric engine.

---

## 2. Body fat

Source field:

```text
body_fat_pct
```

Current value display unit:

```text
%
```

Changes must be displayed in percentage points:

```text
pp
```

Example:

```text
Current
25.6%

From start
-4.4 pp

From previous
-1.2 pp
```

Do not display percentage-point deltas as `%`.

---

## 3. Body fat mass

Derived metric:

```text
body_fat_mass_kg
```

For every historical measurement where both are available:

```text
weight_kg
body_fat_pct
```

calculate:

```text
weight_kg * body_fat_pct / 100
```

Then apply the generic metric-history summary to the derived sequence.

Do not calculate body-fat mass only from the current record if historical changes are displayed.

Display unit:

```text
kg
```

---

## 4. Muscle mass

Source field:

```text
muscle_mass_kg
```

Display unit:

```text
kg
```

Use standard metric-history summary behavior.

---

## 5. Waist

Source field:

```text
waist_cm
```

Display unit:

```text
cm
```

Use standard metric-history summary behavior.

---

## 6. Waist-to-hip ratio

Derived metric:

```text
waist_to_hip_ratio
```

For every historical measurement where both are available:

```text
waist_cm
hip_cm
```

calculate:

```text
waist_cm / hip_cm
```

Then apply the generic metric-history summary to that derived sequence.

The ratio is unitless.

Do not display:

```text
cm
```

or:

```text
%
```

for this metric.

---

## Missing values

Metrics may be unavailable because historical measurements are partial.

If a metric has no non-null observation:

```text
current = null
```

The dashboard must show a neutral unavailable state such as:

```text
—
```

Do not show:

```text
0
```

for missing values.

Do not fabricate changes.

---

## Missing previous value

When:

```text
changeFromPrevious = null
```

display a neutral placeholder such as:

```text
—
```

Do not display:

```text
0
```

unless the metric engine actually returns zero.

---

## Change from start with one observation

If there is only one valid value:

```text
changeFromFirst = 0
```

Display zero normally.

Example:

```text
0.00 kg
```

This is different from a missing comparison.

---

## Direction indicators

The dashboard may visually distinguish positive and negative numeric changes.

However:

Do not interpret:

```text
increase = good
decrease = bad
```

or vice versa.

Do not use health judgments such as:

- good
- bad
- healthy
- unhealthy
- improvement
- deterioration

unless a future specification explicitly defines them.

A positive or negative sign is sufficient.

---

## Formatting

Formatting belongs to dashboard/presentation code.

Metric-engine functions must remain numeric.

Recommended initial display precision:

### Weight

```text
2 decimals
```

Example:

```text
53.80 kg
```

### Body fat

```text
1 or 2 decimals
```

Use one consistent choice.

### Body fat mass

```text
2 decimals
```

### Muscle mass

```text
2 decimals
```

### Waist

```text
1 or 2 decimals
```

Use one consistent choice.

### Waist-to-hip ratio

```text
2 decimals
```

### Percentage-point changes

Use the same reasonable precision as the percentage metric.

Do not mutate or round stored values.

Only round for display.

---

## Signed changes

Positive changes should include:

```text
+
```

Negative changes naturally include:

```text
-
```

Examples:

```text
+0.75 kg
-1.25 kg
0.00 kg
```

For percentage-point changes:

```text
+1.2 pp
-4.4 pp
```

---

## Page architecture

Prefer server-side data loading.

Recommended structure:

```text
app/page.tsx
```

responsible for:

- loading profiles
- resolving selected profile
- loading profile measurements
- preparing data needed by the dashboard

Reusable dashboard components may live in:

```text
components/dashboard/
```

or an equivalent existing convention.

Do not put all data access, calculation, formatting, and markup into one large component.

---

## Query/data boundary

Database query code should retrieve raw persisted values.

Metric calculation should happen through the existing domain metric engine.

Presentation formatting should happen separately.

Conceptually:

```text
Supabase
   ↓
raw measurements
   ↓
metric engine
   ↓
numeric summaries
   ↓
display formatting
   ↓
dashboard cards
```

Do not combine all layers into one function unless the existing architecture clearly supports a small, testable abstraction.

---

## Derived history behavior

For derived metrics, calculate a derived value for each historical measurement individually.

Example:

```text
Measurement A
weight = 60
body fat = 30

Measurement B
weight = 59
body fat = NULL

Measurement C
weight = 58
body fat = 25
```

Body-fat-mass sequence:

```text
A = 18
B = null
C = 14.5
```

The metric-history summary must therefore use:

```text
current = 14.5
first = 18
previous = 18
```

Measurement B must be skipped for this derived metric.

---

## Empty profile state

If the selected profile has no measurements, show a clear empty state.

Recommended message:

```text
No measurements yet.
```

Include a clear link or action to:

```text
/measurements/new
```

Do not treat this as an application error.

---

## New measurement action

The dashboard should provide an obvious way to open:

```text
/measurements/new
```

Suggested label:

```text
New measurement
```

Do not build the form again inside the dashboard.

Reuse the route created in SPEC-003.

---

## Loading and errors

Handle data-loading failures clearly.

Do not silently render zero values when Supabase queries fail.

A database/query error should be distinguishable from:

```text
metric not measured
```

Keep user-facing error text concise.

Do not expose credentials or sensitive database internals.

---

## UI scope

Create a clean summary dashboard.

Suggested structure:

```text
Profile selector / profile heading

New measurement action

Metric cards:
- Weight
- Body fat
- Body fat mass
- Muscle mass
- Waist
- Waist-to-hip ratio
```

Responsive behavior is expected.

A simple card grid is sufficient.

Do not build charts in this spec.

Do not introduce a large UI framework unless already present.

---

## Accessibility

Use semantic HTML.

Ensure:

- profile control is labeled
- links/actions are keyboard accessible
- headings follow a logical hierarchy
- unavailable values have understandable text/accessibility context
- information is not conveyed only through color

---

## Tests

Add tests for dashboard transformation/formatting logic where practical.

Do not require heavy browser/E2E infrastructure for this spec unless it already exists.

At minimum, test logic that is not already guaranteed by SPEC-002.

Required cases:

### Weight dashboard summary

Input history:

```text
55.05
53.80
```

Expected numeric summary:

```text
current = 53.80
changeFromFirst = -1.25
changeFromPrevious = -1.25
```

---

### Body-fat percentage formatting

Numeric change:

```text
-5
```

must display using:

```text
pp
```

not:

```text
%
```

---

### Missing metric

A metric with only null historical values must display as unavailable, not zero.

---

### Derived body-fat mass history

Example:

```text
Measurement A
weight = 60
body fat = 30

Measurement B
weight = 59
body fat = null

Measurement C
weight = 58
body fat = 25
```

Expected derived values:

```text
18
null
14.5
```

Expected summary:

```text
current = 14.5
first = 18
previous = 18
changeFromFirst = -3.5
changeFromPrevious = -3.5
```

---

### Derived waist-to-hip history

Verify that measurements missing either waist or hip produce a null derived value and are skipped by metric-history comparison logic.

---

### One valid observation

Expected:

```text
changeFromFirst = 0
changeFromPrevious = null
```

Dashboard must distinguish those values visually.

---

## Manual verification

Run the application and verify the dashboard against the existing development Supabase data.

At minimum verify:

- a real profile loads
- existing measurement data is used
- weight summary matches the known test history where applicable
- missing metrics render as unavailable
- the New measurement action opens the existing form
- submitting/adding data is not duplicated in the dashboard

Do not create unnecessary production-like test data just to populate every card.

---

## Acceptance criteria

SPEC-004 is complete when:

1. the root page or approved dashboard route displays the dashboard
2. the temporary raw Supabase verification output is removed
3. profiles are loaded dynamically
4. a profile can be selected or automatically resolved when only one exists
5. profile measurement history is loaded from Supabase
6. the dashboard shows:
   - Weight
   - Body fat
   - Body fat mass
   - Muscle mass
   - Waist
   - Waist-to-hip ratio
7. every available metric shows:
   - current value
   - change from start
   - change from previous
8. metric-history calculations reuse SPEC-002
9. body-fat mass uses historical derived values
10. waist-to-hip ratio uses historical derived values
11. null metrics display as unavailable, not zero
12. missing previous comparisons display as unavailable
13. percentage changes are displayed in `pp`
14. positive/negative values are not interpreted as good or bad
15. display rounding does not alter calculation values
16. a clear New measurement action links to the existing form
17. empty profiles have a usable empty state
18. dashboard-specific tests pass
19. all existing tests still pass
20. `npm test` passes
21. `npm run lint` passes
22. `npm run build` passes
23. manual verification against Supabase succeeds
24. no database schema changes are made
25. no chart, history-management, edit/delete, auth/RLS, or import feature is added

---

## Out of scope

Do not implement:

- charts
- trend lines
- full measurement history table
- measurement editing
- measurement deletion
- profile creation/editing
- location creation/editing
- Excel import
- authentication
- Row Level Security
- medical interpretation
- target values
- automated recommendations
- weekly averages
- forecasting
- segmental Tanita metrics

---

## Expected files

Likely modifications:

```text
app/page.tsx
```

Likely additions may include:

```text
components/dashboard/*
lib/dashboard/*
```

or equivalent locations matching existing project conventions.

Dashboard-specific tests may be colocated or use the current test structure.

Reuse:

```text
lib/metrics/*
```

Do not duplicate the metric engine.

Do not modify:

```text
supabase/migrations/*
```

Do not make unrelated refactors.

---

## Completion report

When finished, report only:

- files created/changed
- dashboard data flow used
- dashboard metrics implemented
- tests added
- `npm test` result
- `npm run lint` result
- `npm run build` result
- manual Supabase verification result
- any unresolved ambiguity

Update this spec status from:

```text
Ready
```

to:

```text
Complete
```

only when all acceptance criteria pass.


