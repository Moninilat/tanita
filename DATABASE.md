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

For V1, location names should be trimmed before storage and treated as unique case-insensitively. The eventual design should enforce this with a unique index based on `lower(trim(name))`.

### `measurements`

A measurement is one observation recorded at a particular time and location for exactly one profile. It contains measurement metadata, optional Tanita values, optional manual circumference values, and system timestamps.

The confirmed Tanita device is the RD-545HR. Its supported V1 device measurements are represented by the Tanita fields below. All Tanita fields remain nullable because historical records may be incomplete.

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
| `entry_method` | `text` | `NOT NULL` | Initially `manual` or `import`. |
| `notes` | `text` | nullable | Optional context about the observation. |
| `weight_kg` | `numeric(7,3)` | nullable | Body weight in kilograms. This preserves the RD-545HR increments of 0.05 kg below 100 kg and 0.1 kg above 100 kg, within its 200 kg capacity. |
| `bmr_kcal` | `numeric(7,2)` | nullable | Basal metabolic rate in kcal/day. |
| `bone_mass_kg` | `numeric(6,3)` | nullable | Estimated bone mass in kilograms. |
| `visceral_fat_rating` | `numeric(5,2)` | nullable | Tanita visceral-fat rating or level, not kilograms. |
| `body_fat_pct` | `numeric(5,2)` | nullable | Body fat percentage, stored as `25.6` for 25.6%. |
| `muscle_mass_kg` | `numeric(7,3)` | nullable | Estimated muscle mass in kilograms. |
| `muscle_quality_score` | `smallint` | nullable | Numeric muscle-quality score reported by the RD-545HR; no health interpretation is stored. |
| `physique_rating` | `smallint` | nullable | Numeric physique rating reported by the RD-545HR; descriptive labels are mapped in the application layer. |
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

The chosen precisions are initial storage limits, not display rules. The application may display fewer decimal places while retaining the stored value. The RD-545HR weight precision and capacity are accounted for above. The score fields use `smallint` because they are numeric whole-number Tanita-reported scores; their validation intentionally requires only a positive value and does not add speculative upper bounds.

## Constraints

### Primary keys

- `profiles.id`, `locations.id`, and `measurements.id` are UUID primary keys.
- The eventual Supabase migration should generate UUID values by default using the platform-supported UUID generation function.

### Required fields

The initial required measurement fields are exactly:

- `profile_id`
- `location_id`
- `measured_at`
- `entry_method`

No Tanita or manual numeric field is required. An absent observation is represented by `NULL`, never by zero.

`profiles.name` and `locations.name` are also required because neither record is useful without a label. System timestamps are required on all three tables and should default to `now()` when records are created.

`created_at` and `updated_at` should both default to `now()`. The eventual PostgreSQL design should maintain `updated_at` automatically with an update trigger on each table rather than relying on application code to set it consistently.

### Foreign keys

- `measurements.profile_id` references `profiles.id`.
- `measurements.location_id` references `locations.id`.

The foreign-key columns use the same `uuid` type as their referenced primary keys.

### Entry method values

`measurements.entry_method` is `text` with a check constraint allowing only these initial values:

- `manual`
- `import`

`manual` means the measurement was entered manually into the application, including values read from a Tanita device. `import` means the record was imported from historical data such as Excel. A single measurement may contain both Tanita values and manually measured circumferences, so `entry_method` describes how the record entered the application rather than the type of body values it contains.

This is intentionally a check constraint rather than a PostgreSQL enum so future values such as `device_sync` can be added without an enum migration. New values should be introduced deliberately and documented.

### Numeric validation

The eventual migration should add checks equivalent to the following rules:

- `height_cm IS NULL OR height_cm > 0`.
- Each non-null mass or energy value (`weight_kg`, `bmr_kcal`, `bone_mass_kg`, and `muscle_mass_kg`) is greater than zero.
- `muscle_quality_score IS NULL OR muscle_quality_score > 0`.
- `physique_rating IS NULL OR physique_rating > 0`.
- `heart_rate_bpm IS NULL OR heart_rate_bpm > 0`.
- `metabolic_age IS NULL OR metabolic_age > 0`.
- Each non-null circumference (`abdomen_cm`, `flexed_arm_cm`, `arm_cm`, `waist_cm`, `hip_cm`, and `thigh_cm`) is greater than zero.
- `body_fat_pct IS NULL OR body_fat_pct BETWEEN 0 AND 100`.
- `body_water_pct IS NULL OR body_water_pct BETWEEN 0 AND 100`.
- `visceral_fat_rating IS NULL OR visceral_fat_rating BETWEEN 1 AND 59`.

Missing values are represented by `NULL`, not zero. These checks require positive values where a present measurement must be meaningful, while avoiding assumptions about narrow physiological ranges that may vary by device or future use. The RD-545HR-specific visceral-fat range is documented separately below. The checks do not silently change supplied values.

For the RD-545HR, `visceral_fat_rating` is a rating/level, not kilograms. Its documented scale is 1 through 59 and it may contain decimal values such as `5.5`. The eventual migration should use the equivalent nullable check shown above.

`muscle_quality_score` is stored only as the numeric score reported by Tanita. `physique_rating` is stored only as the numeric rating reported by Tanita; descriptive rating labels are not stored in the measurement record and may be mapped in the application layer. Neither field receives a health interpretation in the database layer.

A measurement must contain at least one non-null body measurement value from the Tanita or manual measurement fields. For V1, this rule should be enforced by application validation rather than by a large SQL `CHECK` constraint.

`birth_date` is a date rather than a timestamp because time of birth is not part of the current data model. Whether future dates should be rejected is left to the application and migration decision process.

### Name validation and location normalization

The eventual migration should reject blank or whitespace-only names for profiles and locations, for example by checking that the trimmed text is not empty. For V1, location names must be trimmed before storage and unique case-insensitively. Add a future unique index based on `lower(trim(name))` for `locations`.

### Derived values excluded

The schema must not add columns for:

- `body_fat_mass_kg`
- `waist_to_hip_ratio`
- `bmi`
- `change_from_first_measurement`
- `change_from_previous_measurement`

These values depend on other records or calculations and must be computed dynamically from stored observations. BMI is calculated from `weight_kg` and profile `height_cm`; it is not a Tanita field stored in `measurements`. This keeps historical edits and deletions reflected in the results.

## Indexes

The primary keys automatically provide indexes for direct lookup. Add the following secondary indexes in the eventual migration:

### Chronological measurements by profile

Create a composite index on `measurements (profile_id, measured_at, id)`.

This supports the primary retrieval pattern: fetch one profile's measurements in chronological order using `measured_at`, with `id` providing stable ordering for equal timestamps. It also supports locating earlier records when calculating metric-specific first and previous values.

The application should query this index in ascending order for history and may request descending order for a latest-measurement view. PostgreSQL can scan the composite index in either direction.

### Measurements by location

Create an index on `measurements (location_id, measured_at, id)` if the application will provide history or comparisons by location. This is recommended because location comparisons are part of the future model, though it is less central than the profile chronology query.

### Possible later indexes

Do not add indexes for every numeric measurement field initially. Index a measurement value only after a real filtering or reporting query requires it. An `entry_method` index is also unnecessary until entry-method filtering is a demonstrated access pattern.

## Device Scope and Future Extensions

The V1 device is the Tanita RD-545HR. Its supported V1 fields are the nine retained Tanita fields plus `muscle_quality_score` and `physique_rating` listed in the measurements table. BMI is deliberately derived from stored weight and profile height rather than stored as a measurement field.

The RD-545HR also supports segmental body-fat, segmental muscle-mass, and segmental muscle-quality measurements. Segmental measurements are outside the V1 schema and must not be added to `measurements` yet. They remain a future extension that may require a separate related table or another deliberate schema design.

## Deletion Behavior

### Deleting a profile: `ON DELETE RESTRICT`

Deleting a profile should be rejected while measurements still reference it. Profiles containing measurements must not be deletable accidentally, and retaining the foreign-key relationship preserves the complete measurement history. Deleting a complete profile and its history should eventually be an explicit, authorized application operation rather than an automatic foreign-key cascade.

### Deleting a location: `ON DELETE RESTRICT`

Deleting a location should be rejected while measurements still reference it. Locations describe historical context, so silently deleting or nulling that relationship would damage the meaning of existing records. The application can require measurements to be reassigned or removed before deleting a location.

`RESTRICT` is preferred over `SET NULL` because `location_id` is intentionally required for every measurement.

### Deleting a measurement

Deleting a measurement removes only that observation. It does not delete its profile or location. Application calculations must then recalculate metric-specific first and previous values from the remaining non-null observations.

## Decisions Before Migration

1. **Confirm UUID generation.** Choose the UUID default supported by the target Supabase/PostgreSQL version and use it consistently across all three tables.
2. **Confirm remaining numeric precision.** Compare the proposed `NUMERIC(precision, scale)` choices with representative historical Excel values and RD-545HR output, especially for BMR, visceral-fat rating, and the two added score fields.
3. **Confirm time-entry behavior.** The database supports full `timestamptz` values and multiple measurements on one day. Decide whether the initial UI asks for a time, supplies a default time, or accepts a date-only workflow that is converted to a timestamp.
4. **Define deletion authorization and workflow.** Profile deletion is restricted at the foreign-key level. Define the explicit application operation, authorization, confirmation, and history-removal behavior during the Supabase security phase.
5. **Define Row Level Security ownership.** Authentication users should not be assumed to have a one-to-one relationship with profiles. Determine how authenticated users may be linked to one or more profiles and who may read, insert, update, or delete each table. RLS is intentionally outside this schema design.
6. **Confirm whether locations are shared.** This design permits a location to be referenced by measurements from multiple profiles. Decide whether future authorization rules should allow that or require profile-specific locations.
7. **Confirm future device metadata.** If measurements from multiple Tanita devices must be distinguished, decide whether a device table or device identifier should be added before migration.
8. **Confirm whether historical profile height is needed.** The current model stores height on `profiles`; preserving height at measurement time would require a later design decision.
9. **Confirm location management workflow.** Decide whether users can create and edit locations directly from the measurement form or whether locations are managed from a separate settings page.
10. **Confirm derived metric display.** Confirm which derived metrics should appear prominently on the dashboard; this does not change the rule that derived metrics are not stored.
11. **Confirm change terminology.** Confirm the final UI labels for changes from the start and previous measurement. This does not change the database schema.

Until these decisions are confirmed, this document should be treated as the proposed design rather than a migration contract.
