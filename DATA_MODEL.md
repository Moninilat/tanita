# Data model

This document defines the domain data model for the Tanita tracker. It is primarily about what the application means and how it computes values, not about status tracking or implementation timelines.

Implementation note: the current V1 schema is implemented in Supabase and reflects the Tanita RD-545HR measurement set plus manual circumference fields. The application stores raw observation data and calculates derived metrics from it.

## 1. General principles

### 1.1 Raw data vs derived data

The application stores raw measurements whenever possible.

Examples of raw values:

- weight_kg
- body_fat_pct
- muscle_mass_kg
- waist_cm
- hip_cm
- heart_rate_bpm

Derived values are not stored as permanent database columns when they can be recalculated from stored raw values.

Examples:

- body fat mass in kilograms
- waist-to-hip ratio
- BMI
- change from first non-null measurement
- change from previous non-null measurement

This ensures historical edits and deletions automatically affect derived results.

### 1.2 Units and value conventions

The application uses metric units internally.

- mass and weight: kg
- circumferences and height: cm
- percentages: %
- heart rate: bpm
- basal metabolic rate: kcal
- metabolic age: years

Percentages are stored as percentage values, not fractions.

Example:

```text
25.6
```

means 25.6%, not 0.256.

### 1.3 Dates and timestamps

Measurement timestamps use the field name measured_at and support a date and time value.

Example:

```text
2026-09-11T08:30:00
```

The database allows multiple measurements on the same day. A measurement history is ordered by measured_at, with id as a stable tie-breaker when timestamps match.

### 1.4 Missing values

Most measurement values are nullable. A measurement may be incomplete.

Missing data is stored as NULL. Zero is not used to represent missing data.

Example:

```text
weight_kg = 53.8
body_fat_pct = null
waist_cm = null
```

This semantics is important because a real value of zero is distinct from an unrecorded value.

### 1.5 Metric-specific change logic

The application computes changes using the most recent prior non-null value for the same metric, not the previous row in the table.

Example:

Measurement A:
- weight = 60
- body fat = 30

Measurement B:
- weight = 59
- body fat = NULL

Measurement C:
- weight = 58
- body fat = 27

For Measurement C:

- previous weight = 59
- previous body fat = 30

This also applies to the first measurement: the comparison is to the first non-null value for that metric, not the first row in the table.

### 1.6 Percentage point deltas

Percentage-based metrics such as body fat and body water use percentage-point changes.

Example:

- 30% -> 25%
- displayed delta: -5 pp

Do not calculate a relative percent change for these metrics.

### 1.7 No average weekly variation

The application needs the following values for each relevant metric:

- current value
- change since first measurement
- change since previous measurement

It does not calculate average weekly variation as a primary output.

## 2. Profile data

Profile data describes the person whose measurements are being tracked. These values are usually stored once rather than repeated for every measurement.

### name

- Type: text
- Required: yes
- Meaning: human-readable profile identifier such as Monique or Nick

### birth_date

- Type: date
- Required: no
- Meaning: date of birth for optional age-based calculations

### height_cm

- Type: numeric
- Required: no
- Unit: cm
- Meaning: the person's height, used for BMI calculations when available

## 3. Measurement metadata

Measurement metadata describes the context of a single recorded observation.

### profile_id

- Type: relationship to profiles
- Required: yes
- Meaning: the profile to which the measurement belongs

### measured_at

- Type: timestamp with time zone
- Required: yes
- Meaning: timestamp of the measurement

### location_id

- Type: relationship to locations
- Required: yes
- Meaning: the location where the measurement was taken

### entry_method

- Type: enum-like persisted value
- Required: yes
- Supported values in V1: manual, import
- Meaning: how the measurement entered the application

Notes:

- manual means the measurement was entered manually, including values read from the Tanita RD-545HR
- import means the record was imported from historical data such as Excel
- entry_method is not a description of which body metrics are present within the row

A single measurement may contain both Tanita values and manual circumference values while still using one entry_method.

### notes

- Type: text
- Required: no
- Meaning: optional commentary about the measurement

## 4. Tanita RD-545HR V1 fields

The confirmed device is the Tanita RD-545HR. The V1 schema includes the following Tanita fields as nullable raw values:

- weight_kg
- bmr_kcal
- bone_mass_kg
- visceral_fat_rating
- body_fat_pct
- muscle_mass_kg
- muscle_quality_score
- physique_rating
- body_water_pct
- heart_rate_bpm
- metabolic_age

These are all stored as raw observations. The application derives certain additional values from them.

## 5. Manual circumference fields

The V1 schema also includes manual circumference measurements:

- abdomen_cm
- flexed_arm_cm
- arm_cm
- waist_cm
- hip_cm
- thigh_cm

These are user-entered circumference values and are nullable because a record may be incomplete.

## 6. Derived metrics

Derived values are calculated from raw stored data and are not stored as direct columns in the database.

Examples:

- body_fat_mass_kg
- waist_to_hip_ratio
- BMI
- change_from_first_measurement
- change_from_previous_measurement

### BMI

BMI is derived from:

- weight_kg
- profile height_cm

It is not stored as a measurement field.

### Body fat mass

Body fat mass is derived from body fat percentage and weight when both are present.

### Waist-to-hip ratio

Waist-to-hip ratio is derived from waist_cm and hip_cm when both are present.

### Change calculations

For each metric in a profile history:

- change from first measurement = current metric value - first non-null value for that metric
- change from previous measurement = current metric value - most recent earlier non-null value for that metric

These calculations are metric-specific and skip nulls for that same metric.

## 7. Segmental metrics are outside V1

The RD-545HR supports segmental body-fat, segmental muscle-mass, and related segmental values, but those are explicitly outside the current V1 scope. They are not part of the implemented measurement table and should not be added without a deliberate extension plan.

## 8. Location and profile relationships

- each measurement belongs to exactly one profile
- each measurement belongs to exactly one location
- a profile can have many measurements
- a location can be referenced by many measurements

Locations should be reusable records rather than free-form repeated text.

## 9. Validation rules

The domain model requires:

- a measurement may contain incomplete values
- null is not zero
- positive values are required when a numeric measurement is present
- percentage metrics are constrained to a valid range such as 0 to 100
- at least one body metric must be present in the row for a valid measurement
- manual and imported measurement records are both valid using the supported entry_method values

## 10. UI labels vs persisted values

The application should keep user-facing labels distinct from the stored values used in the system.

Example:

- friendly UI label: Manual
- persisted value: manual

This keeps the data model explicit while allowing better user experience in the UI.

## 11. Non-medical interpretation

This application does not silently interpret Tanita outputs as medical advice or health labels. Numeric values are treated as data points for tracking over time, not as clinical diagnoses or health recommendations.
```text
Morning measurement before breakfast.
```

---

## created_at

**Human-readable label:** Created at

**Category:** System metadata

**Source:** Application

**Data type:** Date and time

**Unit:** None

**Required:** Yes

**User-entered:** No

**Description:**

Timestamp indicating when the record was created in the application.

---

## updated_at

**Human-readable label:** Updated at

**Category:** System metadata

**Source:** Application

**Data type:** Date and time

**Unit:** None

**Required:** Yes

**User-entered:** No

**Description:**

Timestamp indicating when the record was last modified.

---

# 4. Tanita Measurements

These values come from the Tanita body composition scale.

All Tanita fields should allow null values because not every measurement may contain every metric.

---

## weight_kg

**Human-readable label:** Weight

**Category:** Tanita

**Source:** Tanita

**Data type:** Decimal number

**Unit:** kg

**Required:** No

**User-entered:** Yes

**Description:**

Total body weight measured by the Tanita scale.

---

## bmr_kcal

**Human-readable label:** Basal Metabolic Rate

**Category:** Tanita

**Source:** Tanita

**Data type:** Integer or decimal number

**Unit:** kcal/day

**Required:** No

**User-entered:** Yes

**Description:**

Basal metabolic rate reported by the Tanita scale.

This represents the estimated energy expenditure of the body at rest.

---

## bone_mass_kg

**Human-readable label:** Bone Mass

**Category:** Tanita

**Source:** Tanita

**Data type:** Decimal number

**Unit:** kg

**Required:** No

**User-entered:** Yes

**Description:**

Estimated bone mass reported by the Tanita scale.

---

## visceral_fat_rating

**Human-readable label:** Visceral Fat

**Category:** Tanita

**Source:** Tanita

**Data type:** Decimal or integer number

**Unit:** Rating / level

**Required:** No

**User-entered:** Yes

**Description:**

Visceral fat rating reported by the Tanita scale.

This value must not be interpreted or labeled as kilograms unless the specific Tanita model explicitly reports visceral fat mass in kilograms.

The default assumption is that this is a rating or level.

---

## body_fat_pct

**Human-readable label:** Body Fat

**Category:** Tanita

**Source:** Tanita

**Data type:** Decimal number

**Unit:** %

**Required:** No

**User-entered:** Yes

**Description:**

Body fat percentage reported by the Tanita scale.

Example:

```text
25.6
```

represents:

```text
25.6%
```

---

## muscle_mass_kg

**Human-readable label:** Muscle Mass

**Category:** Tanita

**Source:** Tanita

**Data type:** Decimal number

**Unit:** kg

**Required:** No

**User-entered:** Yes

**Description:**

Estimated muscle mass reported by the Tanita scale.

---

## body_water_pct

**Human-readable label:** Body Water

**Category:** Tanita

**Source:** Tanita

**Data type:** Decimal number

**Unit:** %

**Required:** No

**User-entered:** Yes

**Description:**

Total body water percentage reported by the Tanita scale.

---

## heart_rate_bpm

**Human-readable label:** Heart Rate

**Category:** Tanita

**Source:** Tanita

**Data type:** Integer

**Unit:** bpm

**Required:** No

**User-entered:** Yes

**Description:**

Heart rate recorded during the Tanita measurement.

---

## metabolic_age

**Human-readable label:** Metabolic Age

**Category:** Tanita

**Source:** Tanita

**Data type:** Integer

**Unit:** years

**Required:** No

**User-entered:** Yes

**Description:**

Metabolic age estimated by the Tanita scale.

This is a Tanita-derived measurement and must be stored as the value reported by the device.

It is different from chronological age.

---

# 5. Manual Body Measurements

These measurements are entered manually and generally use centimeters.

All manual measurement fields should allow null values.

---

## abdomen_cm

**Human-readable label:** Abdomen

**Category:** Manual measurement

**Source:** Manual

**Data type:** Decimal number

**Unit:** cm

**Required:** No

**User-entered:** Yes

**Description:**

Circumference of the abdomen.

The exact anatomical measurement procedure should remain consistent between measurements.

---

## flexed_arm_cm

**Human-readable label:** Flexed Arm

**Category:** Manual measurement

**Source:** Manual

**Data type:** Decimal number

**Unit:** cm

**Required:** No

**User-entered:** Yes

**Description:**

Circumference of the arm while flexed.

---

## arm_cm

**Human-readable label:** Arm

**Category:** Manual measurement

**Source:** Manual

**Data type:** Decimal number

**Unit:** cm

**Required:** No

**User-entered:** Yes

**Description:**

Circumference of the relaxed arm.

---

## waist_cm

**Human-readable label:** Waist

**Category:** Manual measurement

**Source:** Manual

**Data type:** Decimal number

**Unit:** cm

**Required:** No

**User-entered:** Yes

**Description:**

Waist circumference.

This value is also used to calculate waist-to-hip ratio.

---

## hip_cm

**Human-readable label:** Hip

**Category:** Manual measurement

**Source:** Manual

**Data type:** Decimal number

**Unit:** cm

**Required:** No

**User-entered:** Yes

**Description:**

Hip circumference.

This value is also used to calculate waist-to-hip ratio.

---

## thigh_cm

**Human-readable label:** Thigh

**Category:** Manual measurement

**Source:** Manual

**Data type:** Decimal number

**Unit:** cm

**Required:** No

**User-entered:** Yes

**Description:**

Thigh circumference.

This value must always be expressed in centimeters.

---

# 6. Derived Values

Derived values are calculated by the application.

They should not be manually entered by the user.

Unless there is a future performance or reporting requirement that justifies caching them, these values should not be stored as permanent raw measurement fields.

---

## body_fat_mass_kg

**Human-readable label:** Body Fat Mass

**Category:** Derived

**Source:** Application calculation

**Data type:** Decimal number

**Unit:** kg

**Required:** No

**User-entered:** No

**Inputs required:**

* weight_kg
* body_fat_pct

**Formula:**

```text
body_fat_mass_kg =
weight_kg × body_fat_pct / 100
```

Example:

```text
Weight: 53.8 kg
Body fat: 25.6%

53.8 × 25.6 / 100
= 13.7728 kg
```

Displayed value may be rounded according to UI rules.

The original calculation should retain sufficient decimal precision.

If either required input is null, the result is null.

---

## waist_to_hip_ratio

**Human-readable label:** Waist-to-Hip Ratio

**Category:** Derived

**Source:** Application calculation

**Data type:** Decimal number

**Unit:** Ratio

**Required:** No

**User-entered:** No

**Inputs required:**

* waist_cm
* hip_cm

**Formula:**

```text
waist_to_hip_ratio =
waist_cm / hip_cm
```

Example:

```text
Waist: 66 cm
Hip: 93.5 cm

66 / 93.5
= 0.70588...
```

The displayed value may be rounded.

If either value is null, the result is null.

If hip circumference is zero, the calculation must not be performed.

---

# 7. Change Calculations

The application must calculate two change values for each supported metric:

1. Change from first measurement
2. Change from previous measurement

These replace the existing Excel concept of average variation.

The application does not need to calculate average weekly variation.

---

## 7.1 Change from first measurement

**Human-readable label:** Change from Start

**Internal concept:** change_from_first_measurement

For a specific metric:

```text
change_from_first =
current_value - first_recorded_value
```

Example:

```text
First weight:
65.35 kg

Current weight:
53.80 kg
```

Calculation:

```text
53.80 - 65.35 = -11.55 kg
```

Displayed result:

```text
-11.55 kg
```

A negative value means the metric decreased.

A positive value means the metric increased.

The application should show mathematical direction only and must not automatically interpret increase or decrease as good or bad.

---

## 7.2 Change from previous measurement

**Human-readable label:** Change from Previous

**Internal concept:** change_from_previous_measurement

For a specific metric:

```text
change_from_previous =
current_value - previous_recorded_value
```

Example:

```text
Previous weight:
55.05 kg

Current weight:
53.80 kg
```

Calculation:

```text
53.80 - 55.05 = -1.25 kg
```

Displayed result:

```text
-1.25 kg
```

---

# 8. Metric-Specific Previous Measurement Rule

The previous measurement must be determined separately for each metric.

The previous record is not necessarily the immediately previous measurement record.

It is the most recent earlier measurement containing a non-null value for that specific metric.

Example:

```text
January 1
Weight: 60 kg
Body fat: 30%

January 10
Weight: 59 kg
Body fat: null

January 20
Weight: 58 kg
Body fat: 27%
```

For the January 20 weight measurement:

```text
Previous weight = 59 kg
```

For the January 20 body fat measurement:

```text
Previous body fat = 30%
```

The January 10 record must be skipped for body fat because its body fat value is null.

---

# 9. Metric-Specific First Measurement Rule

The first measurement must also be determined independently for every metric.

It is the earliest measurement containing a non-null value for that metric.

Example:

```text
January 1
Weight: 60 kg
Body fat: null

January 10
Weight: 59 kg
Body fat: 30%

January 20
Weight: 58 kg
Body fat: 27%
```

For weight:

```text
First recorded value = 60 kg
```

For body fat:

```text
First recorded value = 30%
```

The body fat change from start on January 20 is therefore:

```text
27 - 30 = -3 percentage points
```

---

# 10. Percentage Metric Changes

Changes involving percentage-based metrics must be displayed in percentage points rather than percentages.

Applicable metrics include:

* body_fat_pct
* body_water_pct

Example:

```text
First body fat:
30%

Current body fat:
25%
```

Correct result:

```text
-5 percentage points
```

Recommended UI abbreviation:

```text
-5 pp
```

The application should not display this as:

```text
-5%
```

because that would represent a relative percentage change, which is not the metric required by this application.

---

# 11. Measurement Ordering

Measurements must be ordered using:

```text
measured_at
```

not by:

```text
created_at
```

A historical measurement may be entered after a newer measurement.

Example:

A measurement from August may be imported in September.

Its chronological position must be determined by the August `measured_at` value, not by the September record creation date.

---

# 12. Editing Historical Measurements

If a historical measurement is edited, all derived calculations that depend on it must automatically reflect the updated data.

Example:

If the first weight measurement changes from:

```text
65.35 kg
```

to:

```text
65.10 kg
```

the application must recalculate every relevant "change from start" value.

This is one of the reasons these changes should be calculated dynamically rather than stored permanently.

---

# 13. Deleting Measurements

If a measurement is deleted, the application must automatically determine new first and previous measurements where necessary.

Example:

```text
Measurement A
60 kg

Measurement B
58 kg

Measurement C
57 kg
```

If Measurement B is deleted, then for Measurement C:

```text
Previous measurement = Measurement A
```

Therefore:

```text
Change from previous =
57 - 60
= -3 kg
```

---

# 14. Supported Change Metrics

The application should initially support change calculations for all numeric body metrics.

This includes:

## Tanita

* weight_kg
* bmr_kcal
* bone_mass_kg
* visceral_fat_rating
* body_fat_pct
* muscle_mass_kg
* body_water_pct
* heart_rate_bpm
* metabolic_age

## Manual

* abdomen_cm
* flexed_arm_cm
* arm_cm
* waist_cm
* hip_cm
* thigh_cm

## Derived

Where useful, change calculations may also be displayed for:

* body_fat_mass_kg
* waist_to_hip_ratio

Derived metric changes must be calculated from the derived values of the relevant measurements.

---

# 15. Display Precision

The data model should preserve greater precision than may be shown in the user interface.

Initial recommended display rules:

```text
Weight:
2 decimal places when needed

Circumferences:
1 or 2 decimal places

Percentages:
1 decimal place when appropriate

Body fat mass:
2 decimal places

Waist-to-hip ratio:
3 decimal places

BMR:
whole kcal unless Tanita provides decimals

Heart rate:
whole bpm

Metabolic age:
whole years

Visceral fat rating:
preserve the precision reported by Tanita
```

Trailing zeros may be omitted in the UI where appropriate.

For example:

```text
53.80 kg
```

may be displayed as:

```text
53.8 kg
```

depending on the final UI design.

Internal calculations should not unnecessarily round intermediate values.

---

# 16. Validation Principles

The application should prevent clearly invalid values while avoiding overly restrictive assumptions.

General rules:

* numeric measurements cannot be negative
* percentages should normally be between 0 and 100
* height must be greater than zero
* circumference measurements must be greater than zero when provided
* hip circumference must be greater than zero before calculating waist-to-hip ratio
* future measurement dates may be restricted by the UI unless intentionally supported

Exact validation ranges should be defined later before implementation.

Validation rules should not silently modify user-entered data.

---

# 17. Location Model

Locations should be reusable entities.

Initial examples:

```text
Casa
Colón
Jesús
```

A measurement references one location.

The user interface should allow selecting an existing location.

A future version may allow:

```text
+ Add location
```

The application should avoid duplicate locations caused only by capitalization or whitespace differences.

---

# 18. Profile Model

Measurements must belong to a profile.

Initial examples may include:

```text
Monique
Nick
```

Names must not be duplicated directly into every measurement record as the primary means of identifying the person.

This allows profile information such as height or birth date to be updated without modifying historical measurement records.

---

# 19. Importing Historical Data

Historical Excel data should eventually be converted into the same logical measurement structure used by new measurements.

Imported records should use:

```text
source = import
```

Historical records should preserve their original measurement date using:

```text
measured_at
```

Import logic should not rely on the physical spreadsheet column order after conversion.

Each historical Excel measurement should become one logical measurement record.

---

# 20. Example Logical Measurement

Example:

```text
Profile:
Monique

Measured at:
2026-08-20

Location:
Casa

Source:
tanita

Weight:
53.8 kg

BMR:
1212 kcal

Bone mass:
2.0 kg

Visceral fat:
2.5

Body fat:
25.6%

Muscle mass:
38.05 kg

Body water:
51.1%

Heart rate:
117 bpm

Metabolic age:
21 years

Abdomen:
76 cm

Flexed arm:
27 cm

Arm:
25 cm

Waist:
66 cm

Hip:
93.5 cm

Thigh:
54 cm
```

Derived:

```text
Body fat mass:
13.77 kg

Waist-to-hip ratio:
0.706
```

If the first weight measurement was:

```text
65.35 kg
```

then:

```text
Change from start:
-11.55 kg
```

If the previous recorded weight was:

```text
55.05 kg
```

then:

```text
Change from previous:
-1.25 kg
```

---

# 21. Data Ownership

Every measurement belongs to exactly one profile.

The future database and authorization model must ensure that users can only access profiles and measurements they are authorized to view.

Authentication and Row Level Security implementation are outside the scope of this document and will be defined during the database and security phases.

---

# 22. Future Extensions

The data model should remain compatible with future features such as:

* additional Tanita metrics
* multiple Tanita devices
* measurement device identification
* photo attachments
* body composition charts
* target values
* measurement tags
* CSV import
* Excel import
* CSV export
* Excel export
* PDF reports
* comparison between date ranges
* comparison between locations
* mobile-friendly data entry
* automatic import from compatible devices or APIs if available

Future features should not require redesigning the basic relationship between profiles and measurements.

---

# 23. Open Questions

The following decisions should be confirmed before database implementation.

## 23.1 Tanita model

Confirm the exact Tanita model being used.

This is necessary to verify:

* available metrics
* exact labels
* measurement units
* visceral fat representation
* muscle mass definition
* whether additional useful metrics should be stored

---

## 23.2 Measurement time

Decide whether the initial UI should:

* ask only for date
* ask for date and optional time
* automatically insert the current time

The database should support date and time regardless of the initial UI decision.

---

## 23.3 Required measurement fields

Determine whether any numeric metric should be mandatory.

Initial recommendation:

```text
No Tanita or circumference metric should be mandatory.
```

Required fields should initially be limited to:

```text
profile
measured_at
location
source
```

This allows incomplete historical records and partial measurements.

---

## 23.4 Profile height history

Height currently belongs to the profile.

Consider whether the application should eventually preserve height as it existed at the time of each measurement.

For adult users this is probably unnecessary initially.

---

## 23.5 Location management

Decide whether users can create and edit locations directly from the measurement form or whether locations are managed from a separate settings page.

---

## 23.6 Derived metric display

Confirm which derived metrics should appear prominently on the dashboard.

Initial candidates:

```text
Weight
Body fat %
Body fat mass
Muscle mass
Waist circumference
Waist-to-hip ratio
```

---

## 23.7 Change terminology

Recommended labels in the UI:

```text
Change from Start
Change from Previous
```

Spanish equivalent:

```text
Cambio desde el inicio
Cambio desde la medición anterior
```

These replace the previous spreadsheet concept of:

```text
Avg Var
```

No average variation metric is required.
