# ============================================
# FILE: specs/003-measurement-form.md
# ============================================

# SPEC-003: Measurement Form

## Status

Complete

---

## Goal

Build the first production-oriented data-entry flow for creating a body measurement from the Next.js application and saving it to Supabase.

The form must support:

- profile selection
- location selection
- measurement date/time
- Tanita RD-545HR metrics
- manual circumference metrics
- optional notes
- insertion into Supabase

This specification is limited to creating new measurements.

It does not include:

- dashboard summaries
- charts
- historical comparison UI
- editing existing measurements
- deleting measurements
- Excel import
- authentication
- Row Level Security

---

## Required context

Read only:

- `AGENTS.md`
- `specs/003-measurement-form.md`
- `DATA_MODEL.md`
- `DATABASE.md`

Do not read by default:

- `PROJECT.md`
- `README.md`
- `ROADMAP.md`
- `specs/001-supabase-integration.md`
- `specs/002-metric-engine.md`

Inspect only the existing source files required to implement this form and reuse the existing Supabase client infrastructure from SPEC-001.

Do not read unrelated project files.

---

## Existing state

Already implemented:

- Next.js application
- Supabase application integration
- reusable Supabase server/browser client infrastructure
- `profiles` table
- `locations` table
- `measurements` table
- metric engine from SPEC-002
- unit tests for metric calculations

The remote development database already contains:

- at least one profile
- at least one location
- existing measurement rows

New measurement creation from the Next.js application has not yet been implemented.

---

## User flow

The user opens the new-measurement page.

The form should allow the user to:

1. choose a profile
2. choose a location
3. choose the measurement date
4. optionally provide a measurement time
5. enter any available Tanita values
6. enter any available circumference values
7. add optional notes
8. submit the form

At least one body metric must be entered.

The application then inserts one row into `measurements`.

On success, the user receives clear confirmation.

On failure, the user receives a clear error message and the form should not silently discard entered values.

---

## Route

Recommended route:

```text
/measurements/new
```

Use the existing Next.js App Router architecture.

A different route may be used only if the project already has a clear route convention.

---

## Data sources for selectors

### Profiles

The profile selector must load existing profile records from Supabase.

The user should see the human-readable profile name.

The submitted value must be:

```text
profile_id
```

not the profile name.

---

### Locations

The location selector must load existing location records from Supabase.

The user should see the human-readable location name.

The submitted value must be:

```text
location_id
```

not the location text.

Do not implement location creation in this spec.

---

## Required metadata fields

The form must require:

- profile
- location
- measurement date

The database requires:

- `profile_id`
- `location_id`
- `measured_at`
- `entry_method`

The application must set:

```text
entry_method = manual
```

for records created through this form.

The user must not type `entry_method` manually.

---

## Measurement date and time

The UI must support:

- required date
- optional time

If time is provided, combine date and time into `measured_at`.

If time is not provided, use a deliberate and documented strategy.

Preferred V1 behavior:

```text
use local noon (12:00) for a date-only measurement
```

Reason:

- avoids accidental date changes caused by timezone conversion near midnight
- does not imply the measurement occurred at the current submission time

This is a placeholder timestamp convention for date-only measurements.

Do not display noon as if it were a known real measurement time in later UI.

The implementation should make this behavior explicit in code.

---

## Tanita fields

Support these nullable inputs:

- `weight_kg`
- `bmr_kcal`
- `bone_mass_kg`
- `visceral_fat_rating`
- `body_fat_pct`
- `muscle_mass_kg`
- `muscle_quality_score`
- `physique_rating`
- `body_water_pct`
- `heart_rate_bpm`
- `metabolic_age`

Use labels that are understandable to the user.

Suggested labels:

- Weight
- Basal metabolic rate
- Bone mass
- Visceral fat
- Body fat
- Muscle mass
- Muscle quality
- Physique rating
- Body water
- Heart rate
- Metabolic age

Display units where relevant:

```text
kg
kcal/day
%
bpm
years
```

Do not label visceral fat as kilograms.

---

## Manual circumference fields

Support these nullable inputs:

- `abdomen_cm`
- `flexed_arm_cm`
- `arm_cm`
- `waist_cm`
- `hip_cm`
- `thigh_cm`

All should display:

```text
cm
```

---

## Notes

Support optional:

```text
notes
```

Use a multiline text input.

No rich text is required.

---

## Numeric input behavior

Numeric fields should:

- allow decimal values where appropriate
- not require every metric
- convert empty inputs to `null`
- never send empty strings as numeric database values
- reject obviously invalid negative values
- preserve user-entered numeric precision where practical

Do not silently convert invalid text to zero.

---

## Validation

The form must validate before insertion.

### Required

Must have:

- profile
- location
- date

### Body metric requirement

At least one body metric must be non-null.

Body metrics include any Tanita or manual circumference field.

A form containing only:

- profile
- location
- date
- notes

must be rejected.

Recommended message:

```text
Enter at least one body measurement.
```

---

## Numeric validation

Respect the domain/database rules.

Examples:

- weight must be greater than zero when provided
- BMR must be greater than zero when provided
- bone mass must be greater than zero when provided
- muscle mass must be greater than zero when provided
- heart rate must be greater than zero when provided
- metabolic age must be greater than zero when provided
- circumferences must be greater than zero when provided
- body-fat percentage must be between 0 and 100
- body-water percentage must be between 0 and 100
- visceral-fat rating must be between 1 and 59

Do not duplicate highly detailed database validation unnecessarily if a reusable validation approach is available.

Client-side validation improves UX.

Database constraints remain the final protection layer.

---

## Architecture

Keep concerns separated.

Recommended responsibilities:

### Page/server layer

Responsible for:

- loading profiles
- loading locations
- rendering the form
- handling server-side submission or coordinating the submission flow

### Form component

Responsible for:

- user interaction
- displaying fields
- local form state if needed
- displaying validation errors

### Validation/parser

Responsible for:

- converting form strings into:
  - numbers
  - null
- checking required values
- checking at least one body metric exists

### Supabase data layer

Responsible for:

- inserting into `measurements`

Do not place all logic in one large React component.

---

## Server-side preference

Prefer server-side insertion using a Server Action or equivalent server-side Next.js pattern if it fits the existing project architecture.

Reasons:

- keeps database mutation logic centralized
- reduces unnecessary client-side database access
- provides a clean boundary for validation

Do not introduce a separate backend framework.

---

## Supabase credentials

Use the existing Supabase integration.

Never use or expose:

- service-role credentials
- secret keys

in browser/client code.

Public browser-safe credentials may be used where appropriate.

---

## TypeScript

Use explicit types where helpful.

Do not use `any` for measurement payloads unless strictly unavoidable.

The insert payload should map clearly to the existing database fields.

---

## Success behavior

After a successful insert:

- show a clear success state

Recommended V1 behavior:

```text
Measurement saved successfully.
```

The implementation may either:

- clear the form
- redirect to a simple success state
- remain on the page with confirmation

Choose the simplest clear behavior.

Do not implement dashboard navigation as part of this spec.

---

## Error behavior

On insertion failure:

- show a clear error message
- do not silently fail
- do not expose sensitive database internals to the user
- preserve entered form data where practical

Developer logs may contain more detailed error context.

---

## Accessibility

The form should use:

- real `<label>` elements
- associated inputs
- semantic form controls
- accessible error messaging
- keyboard-friendly controls

Do not rely only on placeholder text as labels.

---

## UI scope

The form should be clean and usable.

Do not spend this spec on visual polish.

Basic grouping is encouraged:

```text
Measurement details
Tanita measurements
Body circumferences
Notes
```

Responsive layout is desirable.

No design system is required.

---

## Tests

Add tests appropriate to the current project.

At minimum, test validation/parsing logic separately from UI where practical.

Required test cases:

### Empty metric form

Given:

```text
profile selected
location selected
date selected
all body metrics empty
```

Expected:

```text
validation failure
```

---

### Weight-only measurement

Given:

```text
weight_kg = 53.8
```

Expected:

```text
valid
```

---

### Empty numeric fields

Empty numeric inputs must become:

```text
null
```

not:

```text
0
```

and not:

```text
""
```

---

### Percentage validation

Reject:

```text
body_fat_pct = 120
```

Accept:

```text
body_fat_pct = 25.6
```

---

### Visceral-fat validation

Reject:

```text
0
60
```

Accept values inside the supported range.

---

### Negative measurements

Reject negative physical measurement values.

---

### Entry method

Form-created measurements must always produce:

```text
entry_method = manual
```

---

## Manual integration verification

After implementation, perform a real development verification against Supabase.

Create one new measurement through the Next.js form.

Verify in Supabase that the resulting row contains:

- correct `profile_id`
- correct `location_id`
- correct `measured_at`
- `entry_method = manual`
- entered body metric values
- unentered metric fields as `NULL`

Do not delete existing reference measurements unless necessary.

Use clearly identifiable development data if creating temporary records.

---

## Acceptance criteria

SPEC-003 is complete when:

1. `/measurements/new` or the approved equivalent route exists
2. existing profiles can be selected
3. existing locations can be selected
4. measurement date can be entered
5. measurement time is optional
6. all V1 Tanita fields are supported
7. all V1 circumference fields are supported
8. notes are supported
9. empty optional numeric fields become `null`
10. at least one body metric is required
11. `entry_method` is automatically set to `manual`
12. valid data can be inserted into Supabase
13. errors are surfaced clearly
14. a successful submission is clearly confirmed
15. no service-role credentials are exposed
16. validation tests pass
17. existing metric-engine tests still pass
18. `npm test` passes
19. `npm run lint` passes
20. `npm run build` passes
21. one real form-created measurement is verified in the development Supabase database
22. no database schema change is made
23. no dashboard, history, auth/RLS, chart, or import feature is implemented

---

## Out of scope

Do not implement:

- creating profiles
- editing profiles
- deleting profiles
- creating locations
- editing locations
- deleting locations
- editing measurements
- deleting measurements
- dashboard
- historical metric summaries
- charts
- Excel import
- authentication
- Row Level Security
- automated Tanita sync
- segmental Tanita measurements
- target values
- medical interpretations

---

## Expected files

Likely files may include:

```text
app/measurements/new/page.tsx
components/measurement-form.tsx
lib/measurements/*
```

or equivalent locations consistent with the existing project.

Tests may be colocated or placed under the existing test convention.

Possible package changes only if a small form/validation dependency is truly useful.

Do not introduce a large form framework without a clear need.

Do not modify:

```text
supabase/migrations/*
```

Do not make unrelated refactors.

---

## Completion report

When finished, report only:

- files created/changed
- validation approach used
- tests added
- `npm test` result
- `npm run lint` result
- `npm run build` result
- result of the real Supabase insertion verification
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

