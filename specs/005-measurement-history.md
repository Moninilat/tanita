# ============================================

# FILE: specs/005-measurement-history.md

# ============================================

# SPEC-005: Measurement History

## Status

Planned

---

## Goal

Build a measurement history view that allows the user to review all recorded measurements for a selected profile in chronological context.

The history must use real measurement data from Supabase.

The page must support:

* profile selection
* a list of historical measurement records
* deterministic measurement ordering
* clear measurement dates
* location display
* measurement detail viewing
* partial measurements
* empty states
* responsive layout

This specification is read-only.

It does not include:

* editing measurements
* deleting measurements
* charts
* authentication
* Row Level Security
* Excel import
* profile creation
* location creation
* medical interpretation

Editing and deletion will be handled in a later specification.

---

## Required context

Read only:

* `AGENTS.md`
* `specs/005-measurement-history.md`
* `DATA_MODEL.md`

Then inspect only the source files directly needed for this task, especially:

* `app/page.tsx`
* `app/measurements/new/`
* `lib/dashboard/data.ts`
* existing Supabase server client/query infrastructure
* relevant shared UI components

Consult `DATABASE.md` only if an exact persisted field name or database relationship creates a concrete ambiguity.

Do not read by default:

* `PROJECT.md`
* `README.md`
* `ROADMAP.md`
* `specs/001-supabase-integration.md`
* `specs/002-metric-engine.md`
* `specs/003-measurement-form.md`
* `specs/004-dashboard.md`

Do not inspect unrelated application code.

---

## Existing state

Already implemented:

* Next.js application
* Supabase integration
* profiles
* locations
* measurements
* measurement creation form
* centralized metric engine
* dashboard
* profile selection on the dashboard
* server-side measurement queries
* automated tests for metric calculations
* automated tests for measurement validation
* automated tests for dashboard behavior

The application can already create and summarize measurements.

This specification adds the ability to review the complete historical measurement records.

---

## Route

Create the measurement history page at:

```text
/measurements
```

The existing measurement creation route remains:

```text
/measurements/new
```

Do not replace or duplicate the creation form.

---

## Page purpose

The history page answers:

```text
What measurements have been recorded for this profile?
```

It should allow a user to:

1. select a profile
2. see all measurements belonging to that profile
3. identify when and where each measurement was recorded
4. inspect the values stored in each measurement
5. distinguish measured values from missing values

This page is primarily for historical review.

It is not a dashboard and must not duplicate the dashboard summary cards.

---

## Profile selection

The history page must show measurements for one selected profile.

### Required behavior

Load existing profiles from Supabase.

If there is only one profile, the page may automatically select it.

If there are multiple profiles, provide a simple way to choose the active profile.

Do not hardcode a profile UUID.

The selected profile determines which measurement rows are loaded.

Profile selection behavior should be consistent with the dashboard where practical.

Do not implement profile creation or profile editing in this specification.

---

## Measurement query

For the selected profile, load its complete measurement history from Supabase.

The history must include the related location name.

Required measurement ordering:

```text
measured_at DESC
id DESC
```

This means the newest measurement appears first.

Chronological semantics must follow `DATA_MODEL.md`.

Do not use:

```text
created_at
```

to determine measurement chronology.

A measurement entered today for a historical date must appear according to:

```text
measured_at
```

not according to the date the database row was created.

---

## Data-access architecture

Prefer server-side data loading.

Database query logic should not be embedded directly into large presentation components.

A reasonable structure is:

```text
app/measurements/page.tsx
```

for route-level loading and page composition.

Reusable query logic may live in:

```text
lib/measurements/
```

or another existing data-access convention.

Reusable history UI may live in:

```text
components/measurements/
```

if useful.

Keep changes narrow and consistent with the existing repository.

---

## Query/data boundary

Supabase query code should retrieve persisted measurement values.

Presentation code should format them for display.

Conceptually:

```text
Supabase
   ↓
raw measurement records
   ↓
history data mapping
   ↓
display formatting
   ↓
measurement history UI
```

Do not introduce medical interpretation or unrelated metric calculations into this flow.

---

## Measurement list

Display one history item for each measurement row.

Each item must make the following information immediately identifiable:

* measurement date
* measurement time where useful
* location
* entry method
* key measurement values

Recommended compact summary values:

* weight
* body fat
* muscle mass
* waist

These values are suggestions for the collapsed/list view.

The full detail view must support all persisted body metrics defined below.

---

## Measurement date

Display:

```text
measured_at
```

in a human-readable format.

The display should clearly show at least the calendar date.

Example:

```text
29 Sep 2026
```

Time may also be displayed when useful.

Do not use:

```text
created_at
```

as the visible measurement date.

---

## Location

Each measurement has a required:

```text
location_id
```

The history query should retrieve the corresponding location name.

Display the user-facing location name.

Do not expose only the location UUID.

Example:

```text
Home
```

not:

```text
0f26afc5-...
```

---

## Entry method

Persisted values currently include:

```text
manual
import
```

Display friendly UI labels.

Example:

```text
manual -> Manual
import -> Import
```

Keep persisted values and display labels separate.

Do not modify the stored value for presentation purposes.

---

## Full measurement detail

The user must be able to inspect the complete stored measurement.

This may be implemented as:

* expanded rows
* expandable cards
* a disclosure/details element
* a dedicated read-only detail component

Do not create an edit form in this specification.

The detail view should include all available measurement fields.

---

## Tanita metrics

Support display of these persisted Tanita values:

```text
weight_kg
bmr_kcal
bone_mass_kg
visceral_fat_rating
body_fat_pct
muscle_mass_kg
muscle_quality_score
physique_rating
body_water_pct
heart_rate_bpm
metabolic_age
```

Recommended user-facing labels:

```text
Weight
BMR
Bone mass
Visceral fat
Body fat
Muscle mass
Muscle quality
Physique rating
Body water
Heart rate
Metabolic age
```

---

## Manual circumference metrics

Support display of:

```text
abdomen_cm
flexed_arm_cm
arm_cm
waist_cm
hip_cm
thigh_cm
```

Recommended user-facing labels:

```text
Abdomen
Flexed arm
Arm
Waist
Hip
Thigh
```

---

## Metadata

The detail view should also support:

```text
measured_at
location
entry_method
notes
```

Do not display internal metadata by default such as:

```text
profile_id
location_id
created_at
updated_at
```

The measurement UUID also does not need to be visible in the normal UI.

It may be used internally as a React key or route identifier.

---

## Missing values

Measurements may be partial.

A `NULL` metric means:

```text
not measured / unavailable
```

It must never be interpreted as:

```text
0
```

For compact history summaries, a missing metric may either:

1. display a neutral placeholder such as:

```text
—
```

or:

2. be omitted if the layout remains clear.

For the expanded detail view, prefer omitting unavailable optional metrics rather than producing a long list of placeholders.

Example:

If a measurement contains:

```text
weight_kg = 53.8
body_fat_pct = 25.6
waist_cm = null
```

the detail may show:

```text
Weight       53.80 kg
Body fat     25.6%
```

and omit:

```text
Waist
```

Do not display:

```text
Waist 0 cm
```

---

## Measurement sections

For readability, the expanded detail should group measurements logically.

Recommended structure:

```text
Body composition

Weight
Body fat
Muscle mass
Bone mass
Body water
Visceral fat
Muscle quality
Physique rating
BMR
Metabolic age
Heart rate
```

and:

```text
Circumferences

Abdomen
Waist
Hip
Arm
Flexed arm
Thigh
```

Then optionally:

```text
Details

Location
Entry method
Notes
```

Do not create empty section headings if a measurement contains no values for that section.

---

## Units

Use appropriate display units.

### Kilograms

```text
weight_kg
bone_mass_kg
muscle_mass_kg
```

Display:

```text
kg
```

### Percentages

```text
body_fat_pct
body_water_pct
```

Display:

```text
%
```

### Circumferences

```text
abdomen_cm
flexed_arm_cm
arm_cm
waist_cm
hip_cm
thigh_cm
```

Display:

```text
cm
```

### BMR

```text
bmr_kcal
```

Display:

```text
kcal
```

### Heart rate

```text
heart_rate_bpm
```

Display:

```text
bpm
```

### Metabolic age

```text
metabolic_age
```

Display in years.

Example:

```text
34 years
```

### Unitless/rating values

Do not append kilograms or percentages to:

```text
visceral_fat_rating
muscle_quality_score
physique_rating
```

---

## Display precision

Formatting belongs to presentation code.

Do not change or round stored database values.

Recommended display precision:

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

### Muscle mass

```text
2 decimals
```

### Bone mass

```text
2 decimals
```

### Body water

```text
1 or 2 decimals
```

Use one consistent choice.

### Circumferences

```text
1 or 2 decimals
```

Use one consistent choice.

Integer-style fields should not unnecessarily display decimal places when their value is integral.

---

## Derived metrics

Do not make derived metrics a requirement of this history specification.

The purpose of this page is primarily to inspect persisted measurement records.

Therefore, the detail view does not need to display:

```text
body_fat_mass_kg
waist_to_hip_ratio
bmi
change_from_first
change_from_previous
```

These values are derived and are not stored in the measurement record.

They may be introduced into historical analysis in a later specification if needed.

Do not store any derived values in Supabase as part of this work.

---

## Notes

If:

```text
notes
```

contains text, display it in the expanded detail.

If notes are:

```text
NULL
```

or empty, omit the notes section.

Preserve the content as user-entered text.

Do not interpret or summarize notes.

---

## Empty profile state

If the selected profile has no measurements, show a clear empty state.

Recommended message:

```text
No measurements yet.
```

Provide a clear action linking to:

```text
/measurements/new
```

Suggested label:

```text
New measurement
```

This is not an application error.

---

## No profiles state

If there are no profiles available, show a clear state rather than allowing the page to fail.

Do not hardcode a fallback profile.

The UI may display a concise message such as:

```text
No profiles available.
```

Profile creation remains outside this specification.

---

## New measurement action

The history page must provide an obvious link or action to:

```text
/measurements/new
```

Suggested label:

```text
New measurement
```

Do not rebuild the creation form inside `/measurements`.

---

## Dashboard navigation

Provide a simple way to return to the dashboard.

The application should make it reasonably easy to move between:

```text
/
```

and:

```text
/measurements
```

Do not build a large navigation system solely for this specification.

A simple link is sufficient.

---

## History navigation from dashboard

If appropriate for the existing dashboard design, add a link from the dashboard to:

```text
/measurements
```

Suggested labels:

```text
View history
```

or:

```text
Measurement history
```

Keep this change small.

Do not redesign the dashboard.

---

## URL/profile behavior

If the existing profile-selection implementation uses a query parameter, reuse that convention where practical.

For example:

```text
/measurements?profile=<uuid>
```

Do not introduce a second incompatible profile-selection mechanism without a reason.

The page must still validate that the selected profile exists in the loaded profile list.

Do not trust an arbitrary profile ID from the URL without checking it against available profiles.

---

## Sorting behavior

Default sorting is fixed for this specification:

```text
newest first
```

Equivalent database ordering:

```text
measured_at DESC
id DESC
```

Do not implement user-selectable sorting in SPEC-005.

Do not add:

* oldest first toggle
* metric sorting
* location sorting
* custom filtering

These may be considered later.

---

## Filtering

Do not implement advanced filtering in this specification.

Out of scope:

* date-range filtering
* filtering by location
* filtering by entry method
* searching notes
* filtering by missing metrics

The only required scope selector is:

```text
profile
```

---

## Pagination

V1 does not require complex pagination.

If the existing history is small, all measurements for the selected profile may be loaded and displayed.

Do not add a pagination library or infinite-scroll system solely for this specification.

The implementation should remain structured so pagination could be added later if the dataset grows.

---

## Editing

Do not implement measurement editing in this specification.

The history UI may be structured so a future action can be added, but do not create:

```text
Edit
```

behavior yet.

Do not create an edit route unless a later specification requires it.

---

## Deletion

Do not implement deletion in this specification.

Do not add:

```text
Delete
```

buttons or Supabase delete operations.

Deletion and its confirmation behavior will be defined separately.

---

## Charts

Do not implement charts in this specification.

The history page is a record-oriented view.

Trend visualization will be handled separately.

Do not add a charting dependency.

---

## Responsive behavior

The history page must remain usable on:

* desktop
* tablet
* mobile

Avoid wide tables that require excessive horizontal scrolling.

Cards, stacked rows, or responsive grid layouts are preferred over a large desktop-only table containing every metric.

A compact measurement summary with expandable detail is a suitable approach.

---

## Accessibility

Interactive controls must remain keyboard accessible.

If measurements are expandable:

* use semantic interactive elements
* expose clear expanded/collapsed states
* avoid making a non-interactive `div` behave like a button

Profile selection must have an accessible label.

Links must have meaningful text.

Do not rely exclusively on color to communicate information.

---

## Loading and errors

Handle data-loading errors clearly.

A Supabase query failure must not be rendered as:

```text
No measurements yet.
```

Distinguish between:

```text
successful query with zero measurements
```

and:

```text
query failed
```

Keep user-facing error text concise.

Do not expose:

* credentials
* database connection strings
* stack traces
* sensitive Supabase internals

---

## Suggested component structure

A possible implementation is:

```text
app/
└── measurements/
    ├── page.tsx
    └── new/
        ├── page.tsx
        └── measurement-form.tsx

components/
└── measurements/
    ├── measurement-history.tsx
    ├── measurement-history-item.tsx
    └── measurement-details.tsx

lib/
└── measurements/
    └── data.ts
```

This is only a suggested structure.

Do not create abstractions that are unnecessary for the size of the implementation.

Avoid putting all querying, formatting, selection logic, and markup into one large file.

---

## Reuse

Reuse existing infrastructure where possible.

In particular:

* reuse the Supabase server client
* reuse profile-selection patterns from the dashboard
* reuse existing formatting helpers if suitable
* reuse existing design language/styles
* reuse the existing `/measurements/new` route

Do not copy and slightly modify an existing Supabase client.

Do not duplicate profile query logic unnecessarily if it can be safely shared.

---

## Testing requirements

Add automated tests for the important history behavior.

Tests should focus on meaningful application behavior rather than visual implementation details.

At minimum cover:

### Ordering

Given measurements with different:

```text
measured_at
```

values, they are presented newest first.

If two measurements share the same:

```text
measured_at
```

the `id` tie-breaker produces deterministic ordering.

### Profile isolation

Measurements belonging to another profile must not appear in the selected profile's history.

### Partial measurements

A measurement containing some `NULL` metrics must render valid available values without converting missing values to zero.

### Empty history

A profile with zero measurements must produce the intended empty state.

### Location display

The user-facing location name should be available for each measurement.

### Entry method formatting

Persisted values such as:

```text
manual
```

should be presented using the intended friendly label.

---

## Testing scope

Do not over-test CSS classes or exact DOM structure.

Prefer testing data behavior and user-visible semantics.

Tests should remain stable if the visual layout changes.

Do not require end-to-end browser testing unless the existing project already has that infrastructure.

---

## Acceptance criteria

SPEC-005 is complete when all of the following are true:

1. `/measurements` exists.

2. The page loads profiles from Supabase.

3. The page supports selecting the active profile without hardcoding a profile UUID.

4. Only measurements belonging to the selected profile are shown.

5. Measurements are ordered by:

```text
measured_at DESC
id DESC
```

6. `created_at` is not used as the measurement chronology.

7. Each measurement clearly displays its measurement date.

8. Each measurement displays its user-facing location.

9. Each measurement displays its entry method using a friendly UI label.

10. The user can inspect the complete available persisted measurement values.

11. All supported Tanita metrics can be displayed.

12. All supported circumference metrics can be displayed.

13. `NULL` metric values are never displayed as zero.

14. Partial measurements render correctly.

15. Units are correct.

16. Raw persisted values are not modified for presentation.

17. Derived values are not stored in the database.

18. The page provides an action to create a new measurement using:

```text
/measurements/new
```

19. The page provides a reasonable way to return to the dashboard.

20. The dashboard provides a reasonable way to reach measurement history if appropriate.

21. A selected profile with no measurements shows a clear empty state.

22. Query failures are distinguishable from an empty measurement history.

23. The page is usable on desktop and mobile.

24. No editing behavior is added.

25. No deletion behavior is added.

26. No charts are added.

27. No authentication or RLS work is introduced.

28. Automated tests cover the important history behavior.

29. Existing tests continue to pass.

30. The implementation follows the repository guardrails in `AGENTS.md`.

---

## Out of scope

Do not implement any of the following in SPEC-005:

* measurement editing
* measurement deletion
* charts
* trends
* metric comparison cards
* Excel import
* CSV import
* authentication
* Row Level Security
* profile management
* location management
* advanced filtering
* advanced sorting
* pagination libraries
* infinite scrolling
* segmental Tanita metrics
* medical classifications
* medical recommendations
* health judgments

---

## Completion update

Once the implementation and tests are complete:

1. change this specification status from:

```text
Planned
```

to:

```text
Complete
```

2. do not modify completed specifications unless required by an actual implementation correction

3. update `ROADMAP.md` only if the repository workflow expects completed-phase tracking there

The implementation should remain narrowly scoped to measurement history.
