# ============================================
# FILE: DATA_MODEL.md
# ============================================

# Data Model

This document is the domain source of truth for the Tanita tracker.

It defines the meaning of stored measurements and derived metrics.

It does not define:

- project roadmap
- UI implementation
- database DDL
- authentication
- deployment

For physical database details, see `DATABASE.md`.

---

## 1. Core principles

### Raw vs derived data

Raw observations are stored.

Examples:

- `weight_kg`
- `body_fat_pct`
- `muscle_mass_kg`
- `waist_cm`
- `hip_cm`
- `heart_rate_bpm`

Derived values are calculated in application code and are not stored as measurement columns.

Derived values include:

- `body_fat_mass_kg`
- `waist_to_hip_ratio`
- `bmi`
- `change_from_first`
- `change_from_previous`

---

## 2. Missing values

Most measurement fields are nullable.

`NULL` means:

> This metric was not recorded.

`NULL` must never be interpreted as zero.

Example:

```text
weight_kg = 53.8
body_fat_pct = NULL
waist_cm = NULL
```

A measurement may contain only some metrics.

---

## 3. Units

Internal units:

- weight/mass: kg
- height/circumference: cm
- percentages: percentage values
- heart rate: bpm
- basal metabolic rate: kcal/day
- metabolic age: years

Percentages are stored as:

```text
25.6
```

meaning:

```text
25.6%
```

not:

```text
0.256
```

---

## 4. Profiles

A profile represents one measured person.

### `name`

Human-readable profile name.

### `birth_date`

Optional date of birth.

Chronological age should be derived when needed rather than stored as a current-age field.

### `height_cm`

Optional height in centimeters.

Used for BMI calculations.

---

## 5. Measurement metadata

Every measurement belongs to exactly one profile and one location.

### `profile_id`

Profile associated with the measurement.

### `location_id`

Location where the measurement occurred.

### `measured_at`

Timestamp when the measurement occurred.

Measurement chronology is based on `measured_at`.

When timestamps are identical, `id` may be used as the deterministic tie-breaker.

### `entry_method`

Describes how the record entered the application.

V1 values:

- `manual`
- `import`

#### `manual`

Data entered manually into the application.

This includes values read from the Tanita RD-545HR and typed by the user.

#### `import`

Historical data imported from Excel or another supported source.

`entry_method` does NOT describe which metrics are present.

A manual measurement may contain both:

- Tanita values
- manually measured circumferences

### `notes`

Optional free-text context about a measurement.

---

## 6. Tanita device

The V1 device is:

**Tanita RD-545HR**

V1 stores these raw Tanita metrics:

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

All are nullable.

### `visceral_fat_rating`

This is a Tanita rating/level.

It is not kilograms.

---

## 7. Manual circumference metrics

V1 supports:

- `abdomen_cm`
- `flexed_arm_cm`
- `arm_cm`
- `waist_cm`
- `hip_cm`
- `thigh_cm`

All are nullable and measured in centimeters.

---

## 8. Current metric value

For a metric summary, the current value is:

> the most recent non-null observation for that specific metric.

Example:

```text
2026-09-01
weight = 55
body fat = 30

2026-09-10
weight = 54
body fat = NULL

2026-09-20
weight = 53
body fat = NULL
```

Current weight:

```text
53
```

Current body fat:

```text
30
```

The latest database row is therefore not necessarily the source of the current value for every metric.

---

## 9. First metric value

The first value for a metric is:

> the earliest non-null observation for that specific metric.

Example:

```text
2026-09-01
body fat = NULL

2026-09-10
body fat = 30

2026-09-20
body fat = 27
```

First body-fat value:

```text
30
```

---

## 10. Previous metric value

The previous value is:

> the most recent non-null observation for that metric before the current metric observation.

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
body fat = 27
```

For Measurement C:

```text
previous weight = 59
previous body fat = 30
```

`NULL` rows for that metric are skipped.

---

## 11. Change from start

For a metric with a current value and first value:

```text
change_from_first =
current_value - first_value
```

Example:

```text
first weight = 65.35
current weight = 53.80

change_from_first = -11.55 kg
```

If there is only one recorded value for the metric:

```text
change_from_first = 0
```

because the current and first observations are the same value.

---

## 12. Change from previous

When a previous non-null observation exists:

```text
change_from_previous =
current_value - previous_value
```

Example:

```text
previous weight = 55.05
current weight = 53.80

change_from_previous = -1.25 kg
```

If no previous observation exists:

```text
change_from_previous = null
```

A missing previous value is not equivalent to zero change.

---

## 13. Percentage metrics

For percentage-valued metrics, deltas are expressed in percentage points.

Applies initially to:

- `body_fat_pct`
- `body_water_pct`

Example:

```text
30% -> 25%
```

Correct:

```text
-5 pp
```

Incorrect:

```text
-5%
```

The application does not calculate relative percentage change for this purpose.

---

## 14. Body fat mass

`body_fat_mass_kg` is derived from:

- `weight_kg`
- `body_fat_pct`

Formula:

```text
body_fat_mass_kg =
weight_kg * body_fat_pct / 100
```

Example:

```text
53.8 * 25.6 / 100 = 13.7728 kg
```

If either input is `NULL`:

```text
body_fat_mass_kg = null
```

Do not round intermediate calculations unnecessarily.

---

## 15. Waist-to-hip ratio

`waist_to_hip_ratio` is derived from:

- `waist_cm`
- `hip_cm`

Formula:

```text
waist_to_hip_ratio =
waist_cm / hip_cm
```

If either input is `NULL`:

```text
waist_to_hip_ratio = null
```

If `hip_cm` is zero or invalid, the calculation must not be performed.

---

## 16. BMI

BMI is derived from:

- `weight_kg`
- profile `height_cm`

Formula:

```text
height_m = height_cm / 100

bmi =
weight_kg / (height_m * height_m)
```

If weight or height is missing:

```text
bmi = null
```

BMI is not stored in `measurements`.

---

## 17. Ordering rules

All historical metric calculations use chronological measurement order:

1. `measured_at`
2. `id` as deterministic tie-breaker

`created_at` must not determine measurement chronology.

This matters because historical measurements may be imported or entered after newer measurements.

---

## 18. Historical edits and deletions

Derived values must be recalculated from raw history.

If an old measurement is:

- edited
- inserted
- deleted

then affected values such as:

- first
- previous
- current
- `change_from_first`
- `change_from_previous`

must reflect the resulting history.

This is why these values are not permanently stored.

---

## 19. Derived metric change calculations

Derived metrics may also have changes calculated over time.

Examples:

- `body_fat_mass_kg`
- `waist_to_hip_ratio`
- `bmi`

Each derived metric must first be calculated for each eligible historical measurement.

Its first/current/previous values then follow the same non-null rules as raw metrics.

---

## 20. No average variation

The application does not require:

- average weekly variation
- average change per measurement

Primary metric outputs are:

- current value
- change from start
- change from previous

---

## 21. Display vs calculation precision

Calculation logic should preserve numeric precision.

Rounding belongs to presentation logic unless a formula explicitly requires otherwise.

Suggested display precision may be decided by the UI layer.

Metric-engine functions should not format values as strings.

They should return numeric or `null` results.

---

## 22. Segmental Tanita metrics

The RD-545HR supports segmental metrics.

Segmental body-fat, muscle-mass, and muscle-quality data are outside V1.

Do not add them to the domain model without a deliberate future specification.

---

## 23. Validation semantics

General domain rules:

- `NULL` means missing
- zero does not mean missing
- measurements may be partial
- a valid measurement should contain at least one body metric
- percentage values must be valid percentage observations
- physical measurements must not be negative
- derived calculations return `null` when required inputs are unavailable

Database-specific constraints are defined in `DATABASE.md`.

---

## 24. UI labels vs persisted values

Persisted values and UI labels are separate concerns.

Example:

```text
persisted:
manual

UI:
Manual
```

Domain code should work with persisted/internal values.

---

## 25. Medical interpretation

The tracker records and compares measurements.

Domain calculations must not invent medical diagnoses, health classifications, or clinical interpretations for Tanita values unless a future feature explicitly defines such behavior.

