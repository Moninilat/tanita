# PostgreSQL Database Design

## Scope

This document defines the initial PostgreSQL schema for the Tanita body metrics tracker. It is a design document for the database that will eventually be deployed to Supabase. It does not implement migrations, SQL files, Row Level Security policies, application code, APIs, or derived-metric calculations.

The schema stores observed profile, location, and measurement data. Derived values remain calculated by the application and are deliberately not stored in `measurements`.

## Tables and Relationships

### `profiles`

A profile represents one person whose measurements are tracked. Profile attributes that normally do not change for every measurement, such as name, birth date, and height, are stored once here.

`profiles.id` is the identity referenced by each measurement. The initial data model expects profiles such as Monique and Nick.

### `locations`

A location is a reusable place where measurements are taken, such as Casa, Colón, or Jesús. Storing locations separately avoids repeating unrestricted location text on every measurement.

The initial design does not add a normalized display-name column. Case and whitespace normalization, and whether location names should be unique after normalization, are decisions listed below.

### `measurements`

A measurement is one observation recorded at a particular time and location for exactly one profile. It contains measurement metadata, optional Tanita values, optional manual circumference values, and system timestamps.

Relationships:

- Each measurement belongs to exactly one profile through `measurements.profile_id`.
- Each measurement belongs to exactly one location through `measurements.location_id`.
- A profile can have many measurements.
- A location can be referenced by many measurements.

A measurement is ordered chronologically by `measured_at`, not by `created_at`. The `id` column is included as a deterministic tie-breaker when two records have the same timestamp.

## Proposed SQL Column Types

The following are proposed PostgreSQL column types and nullability. `NUMERIC` is used for decimal body values so that entered measurements are not subject to binary floating-point rounding.

### `profiles`

| Column | Type | Nullability | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | `NOT NULL` | Primary key; generated UUID in the eventual migration. |
| `name` | `text` | `NOT NULL` | Human-readable profile name. |
| `birth_date` | `date` | nullable | Date of birth. |
| `height_cm` | `numeric(6,2)` | nullable | Height in centimeters. |
| `created_at` | `timestamptz` | `NOT NULL` | Record creation time. |
| `updated_at` | `timestamptz` | `NOT NULL` | Last modification time. |

### `locations`

| Column | Type | Nullability | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | `NOT NULL` | Primary key; generated UUID in the eventual migration. |
| `name` | `text` | `NOT NULL` | Reusable location name. |
| `created_at` | `timestamptz` | `NOT NULL` | Record creation time. |
| `updated_at` | `timestamptz` | `NOT NULL` | Last modification time. |

### `measurements`

| Column | Type | Nullability | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | `NOT NULL` | Primary key; generated UUID in the eventual migration. |
| `profile_id` | `uuid` | `NOT NULL` | Foreign key to `profiles.id`. |
| `location_id` | `uuid` | `NOT NULL` | Foreign key to `locations.id`. |
| `measured_at` | `timestamptz` | `NOT NULL` | Date and time when the observation occurred. |
| `source` | `text` | `NOT NULL` | Initially `tanita`, `manual`, or `import`. |
| `notes` | `text` | nullable | Optional context about the observation. |
| `weight_kg` | `numeric(7,3)` | nullable | Body weight in kilograms. |
| `bmr_kcal` | `numeric(7,2)` | nullable | Basal metabolic rate in kcal/day. |
| `bone_mass_kg` | `numeric(6,3)` | nullable | Estimated bone mass in kilograms. |
| `visceral_fat_rating` | `numeric(5,2)` | nullable | Tanita visceral-fat rating or level, not kilograms. |
| `body_fat_pct` | `numeric(5,2)` | nullable | Body fat percentage, stored as `25.6` for 25.6%. |
| `muscle_mass_kg` | `numeric(7,3)` | nullable | Estimated muscle mass in kilograms. |
| `body_water_pct` | `numeric(5,2)` | nullable | Body water percentage, stored as a normal percentage value. |
| `heart_rate_bpm` | `integer` | nullable | Heart rate in beats per minute. |
| `metabolic_age` | `integer` | nullable | Metabolic age in years as reported by Tanita. |
| `abdomen_cm` | `numeric(6,2)` | nullable | Abdomen circumference in centimeters. |
| `flexed_arm_cm` | `numeric(6,2)` | nullable | Flexed-arm circumference in centimeters. |
| `arm_cm` | `numeric(6,2)` | nullable | Relaxed-arm circumference in centimeters. |
| `waist_cm` | `numeric(6,2)` | nullable | Waist circumference in centimeters. |
| `hip_cm` | `numeric(6,2)` | nullable | Hip circumference in centimeters. |
| `thigh_cm` | `numeric(6,2)` | nullable | Thigh circumference in centimeters. |
| `created_at` | `timestamptz` | `NOT NULL` | Record creation time. |
| `updated_at` | `timestamptz` | `NOT NULL` | Last modification time. |

The chosen precisions are initial storage limits, not display rules. The application may display fewer decimal places while retaining the stored value. They should be checked against the exact Tanita model before migration.

## Constraints

### Primary keys

- `profiles.id`, `locations.id`, and `measurements.id` are UUID primary keys.
- The eventual Supabase migration should generate UUID values by default using the platform-supported UUID generation function.

### Required fields

The initial required measurement fields are exactly:

- `profile_id`
- `location_id`
- `measured_at`
- `source`

No Tanita or manual numeric field is required. An absent observation is represented by `NULL`, never by zero.

`profiles.name` and `locations.name` are also required because neither record is useful without a label. System timestamps are required on all three tables and should default to the current timestamp when records are created.

### Foreign keys

- `measurements.profile_id` references `profiles.id`.
- `measurements.location_id` references `locations.id`.

The foreign-key columns use the same `uuid` type as their referenced primary keys.

### Source values

`measurements.source` is `text` with a check constraint allowing only these initial values:

- `tanita`
- `manual`
- `import`

This is intentionally a check constraint rather than a PostgreSQL enum so future source values can be added without an enum migration. New values should be introduced deliberately and documented.

### Numeric validation

The eventual migration should add checks equivalent to the following rules:

- `height_cm IS NULL OR height_cm > 0`.
- Each non-null mass or energy value (`weight_kg`, `bmr_kcal`, `bone_mass_kg`, and `muscle_mass_kg`) is greater than or equal to zero.
- `visceral_fat_rating IS NULL OR visceral_fat_rating >= 0`.
- `heart_rate_bpm IS NULL OR heart_rate_bpm >= 0`.
- `metabolic_age IS NULL OR metabolic_age >= 0`.
- Each non-null circumference (`abdomen_cm`, `flexed_arm_cm`, `arm_cm`, `waist_cm`, `hip_cm`, and `thigh_cm`) is greater than zero.
- `body_fat_pct IS NULL OR body_fat_pct BETWEEN 0 AND 100`.
- `body_water_pct IS NULL OR body_water_pct BETWEEN 0 AND 100`.

These checks prevent clearly invalid negative values while avoiding assumptions about narrow physiological ranges that may vary by device or future use. They do not silently change supplied values.

`birth_date` is a date rather than a timestamp because time of birth is not part of the current data model. Whether future dates should be rejected is left to the application and migration decision process.

### Name validation

The eventual migration should reject blank or whitespace-only names for profiles and locations, for example by checking that the trimmed text is not empty. Case-insensitive and whitespace-normalized uniqueness is intentionally not fixed in this initial design; it is listed under decisions before migration.

### Derived values excluded

The schema must not add columns for:

- `body_fat_mass_kg`
- `waist_to_hip_ratio`
- `change_from_first_measurement`
- `change_from_previous_measurement`

These values depend on other records or calculations and must be computed dynamically from stored observations. This keeps historical edits and deletions reflected in the results.

## Indexes

The primary keys automatically provide indexes for direct lookup. Add the following secondary indexes in the eventual migration:

### Chronological measurements by profile

Create a composite index on `measurements (profile_id, measured_at, id)`.

This supports the primary retrieval pattern: fetch one profile's measurements in chronological order using `measured_at`, with `id` providing stable ordering for equal timestamps. It also supports locating earlier records when calculating metric-specific first and previous values.

The application should query this index in ascending order for history and may request descending order for a latest-measurement view. PostgreSQL can scan the composite index in either direction.

### Measurements by location

Create an index on `measurements (location_id, measured_at, id)` if the application will provide history or comparisons by location. This is recommended because location comparisons are part of the future model, though it is less central than the profile chronology query.

### Possible later indexes

Do not add indexes for every numeric measurement field initially. Index a measurement value only after a real filtering or reporting query requires it. A source index is also unnecessary until source-based filtering is a demonstrated access pattern.

## Deletion Behavior

### Deleting a profile: `ON DELETE CASCADE`

Deleting a profile should delete its measurements automatically because a measurement cannot belong to a profile that no longer exists. This prevents orphaned measurement rows. Profile deletion should still be a deliberate, authorized operation because it removes the profile's complete history.

### Deleting a location: `ON DELETE RESTRICT`

Deleting a location should be rejected while measurements still reference it. Locations describe historical context, so silently deleting or nulling that relationship would damage the meaning of existing records. The application can require measurements to be reassigned or removed before deleting a location.

`RESTRICT` is preferred over `SET NULL` because `location_id` is intentionally required for every measurement.

### Deleting a measurement

Deleting a measurement removes only that observation. It does not delete its profile or location. Application calculations must then recalculate metric-specific first and previous values from the remaining non-null observations.

## Decisions Before Migration

1. **Confirm the Tanita model.** Verify available metrics, units, precision, visceral-fat representation, muscle-mass definition, and any additional fields before finalizing numeric precisions and checks.
2. **Confirm UUID generation.** Choose the UUID default supported by the target Supabase/PostgreSQL version and use it consistently across all three tables.
3. **Decide timestamp defaults and update handling.** Confirm that `created_at` and `updated_at` use the database current timestamp, and decide whether `updated_at` will be maintained by a database trigger or by the application.
4. **Choose location uniqueness rules.** Decide whether `Casa`, `casa`, and names with surrounding whitespace should be treated as the same location. If so, define normalization and the corresponding unique index before migration.
5. **Confirm numeric precision.** Compare the proposed `NUMERIC(precision, scale)` choices with actual historical Excel values and the Tanita device output, especially for BMR, visceral-fat rating, and mass fields.
6. **Confirm time-entry behavior.** The database supports full `timestamptz` values and multiple measurements on one day. Decide whether the initial UI asks for a time, supplies a default time, or accepts a date-only workflow that is converted to a timestamp.
7. **Confirm deletion authorization.** Profile deletion is destructive because of cascading measurements. Define the authorization and confirmation requirements during the Supabase security phase.
8. **Define Row Level Security ownership.** Determine how authenticated users are linked to profiles and who may read, insert, update, or delete each table. RLS is intentionally outside this schema design.
9. **Confirm whether locations are shared.** This design permits a location to be referenced by measurements for multiple profiles. Decide whether future authorization rules should allow that or require profile-specific locations.
10. **Confirm future device metadata.** If measurements from multiple Tanita devices must be distinguished, decide whether a device table or device identifier should be added before migration.
11. **Confirm whether historical profile height is needed.** The current model stores height on `profiles`; preserving height at measurement time would require a later design decision.
12. **Confirm the initial source policy.** Keep the three initial values in the check constraint and define the review process for adding future sources.

Until these decisions are confirmed, this document should be treated as the proposed design rather than a migration contract.
