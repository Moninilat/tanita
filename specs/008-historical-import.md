# ============================================

# FILE: specs/008-historical-import.md

# ============================================

# SPEC-008: Historical Measurement Import

## Status

Complete

---

## Goal

Add a safe workflow for importing historical measurement rows from CSV and Excel `.xlsx` files into the existing `measurements` table.

The workflow must let the user select a target profile, map source columns to existing measurement fields, preview row-level validation results, and explicitly import only selected valid rows. Imported chronology must use the source measurement date/time in `measured_at`, never the import time.

This phase builds on the completed measurement creation, history, edit/delete, and trends functionality. It must preserve the existing data model and use the persisted `entry_method = import` value.

---

## Required context

Read only:

- `AGENTS.md`
- `DATA_MODEL.md`
- `DATABASE.md`
- `specs/003-measurement-form.md`
- `specs/005-measurement-history.md`
- `specs/006-edit-delete-measurement.md`
- `specs/007-measurement-charts.md`
- existing measurement form, validation, and server-action source files

Inspect only the source files directly needed for this feature, especially:

- `app/measurements/new/`
- `app/measurements/page.tsx`
- `app/measurements/trends/page.tsx`
- `lib/measurements/validation.ts`
- `lib/measurements/actions.ts`
- existing Supabase server-client infrastructure
- installed CSV, Excel, and test dependencies, if any

Do not read by default:

- `PROJECT.md`
- `README.md`
- `ROADMAP.md`
- unrelated specs

Do not inspect unrelated application code.

---

## Existing state

Already implemented:

- Next.js App Router application and Supabase server-side data access
- profile and location selectors
- manual measurement creation with centralized validation
- read-only measurement history ordered by `measured_at`
- measurement editing and deletion
- read-only trends for weight, body fat, muscle mass, and waist
- automated tests for validation, history, trends, and server actions

The database already accepts `entry_method` values `manual` and `import`. It stores raw measurement fields, permits partial measurements, requires profile, location, and `measured_at`, and applies numeric constraints. Derived metrics are calculated in application code and are not persisted.

This specification adds file parsing, column mapping, validation preview, duplicate detection, and explicit insertion of new historical records only.

---

## Route and navigation

Create the import workflow at:

```text
/measurements/import
```

Provide a clear way to reach it from measurement history and a return path to history after cancellation or successful import. Preserve the selected profile in navigation where practical, but require the user to confirm a target profile in the import workflow.

Keep existing routes unchanged:

```text
/measurements
/measurements/new
/measurements/[id]/edit
/measurements/trends
```

Do not add import actions to chart points or existing measurement rows.

---

## Supported files and safety limits

Support only:

- UTF-8 CSV files (`.csv`), including an optional UTF-8 byte-order mark
- Excel Open XML workbooks (`.xlsx`)

Do not accept legacy `.xls`, macro-enabled `.xlsm`, `.xlsb`, password-protected workbooks, PDFs, images, or archives submitted as standalone files.

Use maintained, established parsers for CSV and `.xlsx`; do not implement a CSV grammar or XLSX/ZIP parser by hand. Validate file extension and detected content, and handle parser errors without starting an insert.

Apply explicit implementation limits, initially:

- maximum upload size: 5 MiB
- maximum data rows: 5,000
- maximum worksheet count/selection behavior documented in the UI

Reject a file that exceeds a limit with a useful message before preview generation. Do not store the uploaded file or its raw contents in Supabase. Do not execute spreadsheet formulas, macros, external links, or workbook code. Formula cells without a usable literal value must be reported as invalid rather than evaluated.

For `.xlsx`, let the user choose a visible worksheet; default to the first visible worksheet and never silently combine sheets. Ignore fully blank rows. Use the first non-empty row as the header row in V1; selecting or repairing arbitrary header rows is outside scope.

For CSV, detect the delimiter using the parser's supported behavior and show a parse error if the file cannot be represented as a consistent table. Duplicate or blank headers must be surfaced and resolved before mapping; do not silently merge columns.

---

## User workflow

The user should be able to:

1. open `/measurements/import`
2. select one existing target profile
3. choose a CSV or `.xlsx` file and, for Excel, a worksheet
4. map source columns to the supported fields
5. set date/time and numeric parsing options when the source needs them
6. select a default target location when the file has no mapped location column
7. request a preview
8. inspect valid, invalid, and duplicate rows with clear row-level reasons
9. select which eligible rows to import and explicitly confirm any duplicate override or partial import
10. submit the import and receive a result summary
11. return to the selected profile's measurement history or trends view

No measurement may be inserted during file selection, parsing, mapping, or preview. A separate explicit final action is required to insert.

The preview is not an editable spreadsheet-cleanup tool. To fix invalid source values or mapping, the user may change mapping/options and regenerate the preview or correct the source file and upload it again. Do not add bulk editing of parsed values.

---

## Profile and location assignment

### Profile

- Load profiles from Supabase and display human-readable names.
- Require one existing profile for the whole import.
- Store the selected profile's `id` in every inserted row's `profile_id`.
- Do not map a file column to `profile_id`; do not allow a file to distribute rows across profiles.
- Revalidate that the profile exists on the server before insertion.

### Location

Every measurement row requires a valid existing `location_id`.

- If the source has a location column, the user may map it to location. Resolve each nonblank source value to an existing location by trimmed, case-insensitive name; never create a location from source text.
- If the source has no mapped location column, require the user to select one existing target location and apply it to all rows.
- When a mapped location cell is blank, use a selected default location only if the user explicitly selected one; otherwise mark the row invalid.
- A nonblank location value that does not uniquely match an existing location is invalid. Do not silently replace an unknown location with the default.
- Do not map profile or location UUIDs from spreadsheet values.

Revalidate profile/location IDs and location-name resolutions on the server at preview and insertion time.

---

## Column mapping

The mapper must support these destinations:

### Required metadata

- measurement date, mapped to `measured_at`
- optional measurement time, combined with the mapped date when supplied separately
- optional location name
- optional `notes`

The selected target profile is global and is not a mapped column. `entry_method`, IDs, and system timestamps are never mapped from the file.

### Raw measurement metrics

Support these existing persisted fields where present:

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
abdomen_cm
flexed_arm_cm
arm_cm
waist_cm
hip_cm
thigh_cm
```

Requirements:

- Provide an explicit source-to-destination mapping step.
- Auto-suggest a mapping only for normalized exact field names or a small documented set of unambiguous aliases; show all suggestions for user confirmation.
- Require the date mapping and at least one metric mapping.
- A source column may map to at most one destination, and each destination may map to at most one source column, except date and time may be separate columns combined into `measured_at`.
- Ignore unmapped columns and tell the user they will not be imported.
- Do not create database columns or persist source headings to accommodate a workbook.
- Do not offer derived metrics such as BMI, body-fat mass, waist-to-hip ratio, or changes as destinations.

---

## Date and time parsing

`measured_at` records when the measurement occurred, not when it was imported. All date/time parsing must be deterministic and previewed before insertion.

Support:

- ISO date strings (`YYYY-MM-DD`)
- ISO datetimes with an explicit `Z` or UTC offset
- Excel native date/time cells and valid Excel date serials in the mapped date/time columns
- separate mapped date and time columns
- other explicitly selected date string formats such as `MM/DD/YYYY` or `DD/MM/YYYY`

Rules:

- Recognize unambiguous ISO input automatically.
- Require the user to choose a format for ambiguous date strings; do not guess between month-first and day-first.
- When date/time input has no timezone, use an explicit IANA timezone selected for the import, defaulted to the browser's detected timezone and shown in the preview. Do not depend on the server's local timezone.
- A date-only value uses 12:00 noon in that selected timezone, consistent with the existing date-only measurement convention.
- A local datetime without an offset uses the selected timezone. A datetime containing `Z` or an explicit offset preserves that instant.
- Reject invalid calendar dates, invalid times, unsupported date strings, and ambiguous/nonexistent local times rather than silently normalizing them.
- Store the resolved instant in `measured_at`; never substitute upload time, preview time, or import time.
- When separate date and time columns are mapped, a blank time uses the date-only noon convention.

The preview must display the interpreted measurement date/time and timezone context clearly enough for the user to catch an incorrect format or timezone before importing.

---

## Numeric parsing and NULL behavior

Numeric parsing must not silently change values.

- For Excel cells with numeric types, read the underlying numeric value rather than a formatted display string.
- For CSV/text cells, trim surrounding whitespace and parse the entire cell according to an explicit decimal convention. Default to decimal point; let the user choose decimal comma when needed.
- Do not partially parse strings, strip arbitrary characters, infer units, convert units, or turn an invalid numeric string into zero.
- If grouping separators are supported, accept only a well-formed grouping pattern for the selected numeric convention. Otherwise reject the value with a clear row/field error.
- Integer database fields (`muscle_quality_score`, `physique_rating`, `heart_rate_bpm`, and `metabolic_age`) must be whole numbers.
- Reject non-finite values, values that violate existing domain/database ranges, and values that cannot be stored at the existing field precision without silent rounding/truncation.
- Do not use spreadsheet display text such as `N/A`, `-`, or arbitrary labels as numeric zero. Unless explicitly supported as a documented blank marker, non-empty non-numeric values are invalid.

Blank or whitespace-only metric cells map to `NULL`. They never map to `0`. Blank notes map to `NULL`; nonblank notes remain plain text. Preserve valid numeric zero where the field's existing range permits it, such as a zero percentage. Do not convert units or store derived metrics.

---

## Row validation

Validate every data row before it can be selected for insertion, reusing the existing measurement validation rules where practical.

Each row must have:

- the selected existing target profile
- a resolved existing location, from its mapped value or an explicitly selected default
- a valid parsed `measured_at`
- at least one non-NULL body metric

Apply the existing constraints, including:

- positive values for positive-only metrics and circumferences
- `body_fat_pct` and `body_water_pct` between 0 and 100 inclusive
- `visceral_fat_rating` between 1 and 59 inclusive
- integer requirements and database precision/scale requirements for their persisted fields

A notes-only row is invalid. Never insert an invalid row. Do not silently coerce bad values, round into range, change units, or discard individual invalid fields while inserting the rest of that row. A row is insertable only when all mapped nonblank values and required metadata validate.

Report errors against the source row number and field with an actionable message, for example:

```text
Row 12, body_fat_pct: enter a number between 0 and 100.
Row 18, measured_at: this date is ambiguous; choose month-first or day-first.
Row 24, location: "Studio 2" does not match an existing location.
```

Do not expose database internals or secrets in user-facing errors.

---

## Preview behavior

Preview must be available before any insert and show:

- source file and selected worksheet where applicable
- selected target profile and default location, if used
- selected date/timezone and numeric parsing options
- total data rows
- counts of valid, invalid, duplicate, and selected-for-import rows
- a row-level view of interpreted date/time, location, mapped values, notes, and validation result
- clear errors for every invalid row
- which source columns were unmapped and therefore ignored

Valid nonduplicate rows may be selected by default. Invalid rows must be visibly invalid and not selectable for import. Duplicate rows must be excluded by default. Users may explicitly choose to import an otherwise valid duplicate row, with a clear warning and confirmation. Allow users to deselect valid rows.

Use text and icons/labels in addition to color to distinguish row states. On narrow screens, make the preview usable with a responsive row layout or a clearly scrollable table; do not clip the errors or the import controls. Keep keyboard navigation, labels, focus, and validation announcements accessible.

Before committing, show a confirmation summary such as:

```text
Import 42 selected rows; skip 3 invalid rows and 2 duplicates.
```

If invalid rows exist, the user may proceed with explicitly selected valid rows, but the invalid rows must remain excluded and the skipped count must be stated. If no eligible rows are selected, disable the import action.

---

## Duplicate detection

Duplicate detection reduces accidental re-imports; it must never overwrite an existing row.

Use an exact canonical payload fingerprint consisting of:

- target `profile_id`
- resolved `location_id`
- normalized `measured_at` instant
- every supported metric value, with `NULL` equal only to `NULL`
- normalized notes text, with blank notes represented as `NULL`

Compare against existing measurement rows for the target profile regardless of `entry_method`. Also identify exact duplicates within the uploaded file; keep the first occurrence as the candidate and mark later identical rows as duplicates.

- Duplicate rows are identified during preview and excluded by default.
- Show the matching existing measurement date and a link to profile history where practical; do not expose internal UUIDs as the only explanation.
- A user may explicitly select an otherwise valid duplicate to import anyway after acknowledging a duplicate warning.
- Recheck selected payloads against current database rows immediately before insertion. If a row became a duplicate after preview and was not explicitly overridden, skip it and report it.
- If duplicate lookup fails, fail closed: do not insert rows without duplicate status being known.
- Do not update, replace, or delete an existing measurement as part of duplicate handling.

The current schema has no unique constraint for this full-row fingerprint. The server-side recheck is best-effort and prevents normal accidental re-imports, but cannot guarantee race-free deduplication for simultaneous imports. Do not claim stronger guarantees without a separate approved schema change.

---

## Insertion and partial-success behavior

Use the existing Next.js server-action and Supabase server-client architecture. Keep parsing, mapping, validation, duplicate comparison, and persistence in appropriately separated helpers/actions under `lib/measurements/`.

A reasonable structure is:

```text
app/measurements/import/page.tsx
components/measurements/import/import-wizard.tsx
lib/measurements/import/parser.ts
lib/measurements/import/mapping.ts
lib/measurements/import/validation.ts
lib/measurements/import/actions.ts
```

The route should load existing profiles and locations server-side. The presentation layer may manage file selection, mappings, preview options, and row selections, but must not write directly to Supabase.

Before insertion, the server must:

1. verify the target profile and all resolved locations still exist
2. validate the submitted mapping/options and selected row payloads again; never trust client preview state
3. recompute duplicate status against current database rows
4. insert only selected, valid, nonduplicate rows, plus duplicates explicitly overridden by the user
5. set `entry_method = import` server-side for every inserted row
6. omit system-generated identifiers/timestamps and derived values

Do not insert at file upload, parse, mapping, or preview time. Use a bounded single bulk insert for the selected rows so a database error does not leave an undocumented partial batch. On insert failure, report that no rows from that batch were imported, keep the preview available, and provide a safe retry path. Set a row/file cap that keeps the request and insert batch bounded.

Partial success means the user can explicitly import eligible valid rows while invalid, duplicate-by-default, and deselected rows are skipped. It does not mean silently inserting a subset of a failed database batch. After a successful insert, report exact counts for inserted rows, invalid rows skipped, duplicates skipped, and valid rows the user deselected or explicitly overrode.

---

## Error and empty states

Handle clearly:

- no profiles or no locations available
- unsupported, oversized, malformed, empty, or unreadable files
- workbook with no visible worksheet or no data rows
- missing/duplicate headers or invalid mapping
- ambiguous dates or invalid timezone/date/time values
- row-level numeric, location, or required-field failures
- no valid rows or no rows selected
- duplicate lookup failure
- profile/location changed or removed before commit
- server validation or Supabase insert failure

Keep the file/mapping/preview context where practical after an error. Do not expose stack traces, database details, secrets, or raw parser exceptions to the user.

---

## Read-only and non-goals

This specification does not include:

- export
- automatic cloud synchronization
- OCR
- PDF or image import
- bulk editing after import
- advanced spreadsheet cleanup or arbitrary cell editing
- profile or location management
- chart changes
- authentication or Row Level Security
- medical classification or advice
- unrelated refactors

Do not add database columns solely to match spreadsheet headings. Do not store derived metrics. Do not automatically overwrite existing measurements.

---

## Automated tests

Add automated tests for the real parser, mapping, validation, duplicate, and import-result behavior. Keep all existing tests passing.

Required coverage includes:

- CSV parsing, including quoted fields, delimiters, BOM, empty rows, and malformed input
- `.xlsx` worksheet selection, native dates/serial dates, numeric cells, and formula-cell handling
- header normalization, supported aliases, explicit column mapping, duplicate/blank headers, and mapping conflicts
- valid ISO dates, explicit offsets, date-only noon behavior, separate date/time columns, selected date formats, selected timezone behavior, and invalid/ambiguous dates
- blank and whitespace-only cells becoming `NULL`, valid zero percentages staying zero, and invalid numeric text never becoming zero
- numeric locale parsing, integer-only fields, range checks, and precision/scale rejection
- required profile/location/date and at-least-one-metric validation
- unknown/blank location behavior and explicit default-location fallback
- duplicate detection against existing records and within one file, default exclusion, and explicit override behavior
- preview categorization/counts and confirmation of valid rows while invalid rows remain excluded
- preview never inserting data
- server-side revalidation and duplicate recheck before insertion
- successful result counts, zero inserts on bulk insert failure, and retry state/result behavior

Prefer pure parser/mapping/validation/fingerprint tests and focused server-action/data-access tests. Do not rely only on assertions that a mocked method was called; verify parsed payloads, row states, insert payloads, and user-visible result summaries.

---

## Acceptance criteria

The implementation is complete when all of the following are true:

1. A user can import CSV and `.xlsx` files through `/measurements/import`.
2. The user selects one existing target profile and can select a default location when no source location column is mapped.
3. Users can map source columns to existing supported measurement fields without adding schema columns or persisting derived metrics.
4. Dates and times are validated and stored in `measured_at`; import time never controls measurement chronology.
5. Blank spreadsheet cells become `NULL`, never zero, and invalid numeric values are rejected without silent coercion.
6. Every row is validated and previewed with clear valid, invalid, and duplicate states before any insert occurs.
7. The user can explicitly import valid rows while invalid rows remain excluded and clearly counted.
8. Duplicate candidates are excluded by default, can only be included through explicit confirmation, and never overwrite existing data.
9. Server-side validation, profile/location verification, duplicate recheck, and Supabase insertion use the existing application architecture.
10. Imported records use `entry_method = import` and retain their source `measured_at` chronology.
11. Accessible, responsive upload, mapping, preview, error, and result states work on desktop and mobile.
12. Automated tests cover parsing, mapping, date handling, NULL behavior, validation, duplicate detection, and import results; all existing tests remain green.
13. No out-of-scope feature or unrelated refactor is introduced.
