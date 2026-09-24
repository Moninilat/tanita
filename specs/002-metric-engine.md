# ============================================
# FILE: specs/002-metric-engine.md
# ============================================

# SPEC-002: Metric Engine

## Status

Complete

---

## Goal

Implement a centralized, framework-independent metric engine for body measurement calculations.

The metric engine must calculate derived values and historical metric changes from raw measurement data.

It must not depend on:

- React
- Supabase
- UI components
- database queries

---

## Required context

Read only:

- `AGENTS.md`
- `specs/002-metric-engine.md`
- `DATA_MODEL.md`

Do not read by default:

- `PROJECT.md`
- `DATABASE.md`
- `README.md`
- `ROADMAP.md`
- `specs/001-supabase-integration.md`

`DATABASE.md` may be consulted only if an exact persisted field name creates a concrete ambiguity.

---

## Existing state

The application can already connect to Supabase and read measurement data.

SPEC-001 has been completed.

The development database contains this reference weight history:

```text
2026-09-01 -> 55.050 kg
2026-09-11 -> 53.800 kg
```

Expected summary:

```text
current = 53.80
changeFromFirst = -1.25
changeFromPrevious = -1.25
```

Metric calculations have not yet been implemented.

---

## Architecture requirement

All reusable metric calculations must live in centralized domain code.

Recommended location:

```text
lib/metrics/
```

The agent may choose an equivalent location only if the existing project structure provides a clear established convention.

Do not calculate domain metrics directly inside:

- React components
- pages
- Supabase client utilities
- database query functions

The metric engine should consist primarily of pure TypeScript functions.

---

## Requirements

### 1. Body fat mass

Implement a pure function equivalent to:

```text
body_fat_mass_kg =
weight_kg * body_fat_pct / 100
```

Behavior:

- return `null` when weight is `null`
- return `null` when body-fat percentage is `null`
- do not perform UI formatting
- do not unnecessarily round the result

Reference case:

```text
weight = 53.8
body fat = 25.6

result = 13.7728
```

---

### 2. Waist-to-hip ratio

Implement:

```text
waist_to_hip_ratio =
waist_cm / hip_cm
```

Behavior:

- return `null` if waist is `null`
- return `null` if hip is `null`
- return `null` if hip is zero or invalid
- do not format the result

Reference case:

```text
waist = 66
hip = 93.5

result approximately = 0.705882...
```

---

### 3. BMI

Implement:

```text
height_m = height_cm / 100

bmi =
weight_kg / (height_m * height_m)
```

Behavior:

- return `null` if weight is `null`
- return `null` if height is `null`
- return `null` for zero or invalid height
- do not format the result

---

### 4. Generic metric history summary

Implement reusable logic that can summarize one numeric metric across an ordered measurement history.

The metric engine must support:

```text
current
first
previous
changeFromFirst
changeFromPrevious
```

Definitions come from `DATA_MODEL.md`.

The implementation must skip `null` values for the selected metric.

Example:

```text
A = 60
B = null
C = 58
```

For C:

```text
current = 58
first = 60
previous = 60
changeFromFirst = -2
changeFromPrevious = -2
```

---

### 5. Current value semantics

For a complete profile history, the current value for a metric is the most recent non-null value for that metric.

Example:

```text
2026-01-01 body fat = 30
2026-02-01 body fat = null
2026-03-01 body fat = null
```

Current body fat:

```text
30
```

---

### 6. First value semantics

First value is the earliest non-null value for that metric.

Null rows before it must be ignored.

---

### 7. Previous value semantics

Previous value is the most recent non-null value before the current metric observation.

Null rows between observations must be ignored.

---

### 8. Single-observation behavior

For:

```text
[53.8]
```

return:

```text
current = 53.8
first = 53.8
previous = null
changeFromFirst = 0
changeFromPrevious = null
```

---

### 9. No observations

For:

```text
[]
```

or a history containing only null values:

```text
current = null
first = null
previous = null
changeFromFirst = null
changeFromPrevious = null
```

---

### 10. Percentage metrics

The mathematical subtraction is the same:

```text
current - comparison
```

Do not multiply or divide percentage deltas.

Example:

```text
30 -> 25
```

Numeric delta:

```text
-5
```

Presentation code may later label this:

```text
-5 pp
```

The metric engine should not return formatted strings such as `"-5 pp"`.

---

### 11. Historical ordering

Metric-history calculations must use chronological order.

The engine should either:

A. accept already ordered history and document that precondition

or

B. accept `measured_at` / `id` metadata and sort deterministically.

Prefer the simplest reusable design that prevents accidental incorrect results.

If sorting is implemented, use:

1. `measured_at`
2. `id` as tie-breaker

Do not use `created_at`.

---

### 12. Derived metric histories

Design the implementation so that the same generic history-summary logic can later be applied to derived metric sequences such as:

- `body_fat_mass_kg`
- `waist_to_hip_ratio`
- `bmi`

Do not duplicate change-calculation logic separately for every metric.

---

## Types

Create explicit TypeScript types for metric-engine inputs and outputs where they improve safety.

A history-summary result should conceptually represent:

```ts
{
  current: number | null;
  first: number | null;
  previous: number | null;
  changeFromFirst: number | null;
  changeFromPrevious: number | null;
}
```

Exact type/file organization may follow the project's conventions.

---

## Tests

Add automated unit tests for the metric engine.

If the project currently has no unit-test framework, choose a lightweight TypeScript-compatible test framework appropriate for the existing Next.js project.

Do not introduce a large test stack.

Tests must cover at least the following.

### Body fat mass

```text
53.8 kg
25.6%

=> 13.7728 kg
```

Also test missing inputs.

---

### Waist-to-hip ratio

```text
66 / 93.5
```

Also test:

- missing waist
- missing hip
- zero hip

---

### BMI

Test:

- valid weight + height
- missing weight
- missing height
- zero height

---

### Reference weight history

```text
55.05
53.80
```

Expected:

```text
current = 53.80
first = 55.05
previous = 55.05
changeFromFirst = -1.25
changeFromPrevious = -1.25
```

---

### Null skipping

Input:

```text
60
null
58
```

Expected:

```text
current = 58
first = 60
previous = 60
changeFromFirst = -2
changeFromPrevious = -2
```

---

### Multiple values

Input:

```text
65
60
58
```

Expected:

```text
current = 58
first = 65
previous = 60
changeFromFirst = -7
changeFromPrevious = -2
```

---

### Single value

Input:

```text
53.8
```

Expected:

```text
current = 53.8
first = 53.8
previous = null
changeFromFirst = 0
changeFromPrevious = null
```

---

### No values

Input:

```text
[]
```

Expected all values to be `null`.

Also test a list containing only `null` values.

---

### Percentage-point arithmetic

Input:

```text
30
25
```

Expected:

```text
changeFromFirst = -5
changeFromPrevious = -5
```

No relative percentage conversion should occur.

---

## Acceptance criteria

SPEC-002 is complete when:

1. reusable metric logic exists outside React components
2. body-fat mass is implemented
3. waist-to-hip ratio is implemented
4. BMI is implemented
5. generic metric-history summary logic is implemented
6. null values are skipped correctly
7. first/current/previous semantics match `DATA_MODEL.md`
8. the reference weight example returns:

```text
current = 53.80
changeFromFirst = -1.25
changeFromPrevious = -1.25
```

9. percentage metrics produce raw percentage-point numeric deltas
10. automated tests cover the required cases
11. all tests pass
12. `npm run lint` passes
13. `npm run build` passes
14. no database schema is changed
15. no Supabase queries are added or modified unless strictly necessary for test isolation
16. no UI/dashboard feature is implemented

---

## Out of scope

Do not implement:

- dashboard UI
- charting
- measurement form
- database migrations
- schema changes
- authentication
- Row Level Security
- Excel import
- metric health interpretation
- formatting values for display
- target ranges
- weekly averages
- trend forecasting
- segmental Tanita metrics

---

## Expected files

Likely new files:

```text
lib/metrics/*
```

and:

```text
tests/*
```

or colocated unit-test files.

Possible changes:

```text
package.json
package-lock.json
```

only if a unit-test dependency is required.

Do not modify:

```text
supabase/migrations/*
```

Do not make unrelated changes.

---

## Completion report

When finished, report only:

- files created/changed
- test framework used, if one was added
- tests run
- lint result
- build result
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



