# ============================================

# FILE: specs/006-edit-delete-measurement.md

# ============================================

# SPEC-006: Edit and Delete Measurement

## Status

Complete

---

## Goal

Add the ability to update an existing measurement and remove it from Supabase after confirmation.

This phase builds on the completed measurement form and measurement history behavior.

The feature must support:

- loading an existing measurement record
- editing the stored values for one measurement
- reusing the existing measurement form behavior where practical
- validating updates before persistence
- deleting with explicit confirmation
- navigating back to measurement history
- automated tests for update/delete logic and UI behavior

This specification is limited to editing and deleting existing measurements.

It does not include:

- charts
- imports
- authentication
- Row Level Security
- profile management
- location management
- medical interpretation
- unrelated refactors

---

## Required context

Read only:

- `AGENTS.md`
- `DATA_MODEL.md`
- `specs/005-measurement-history.md`
- `specs/003-measurement-form.md`
- existing measurement-form and history-related source files

Then inspect only the source files directly needed for this task, especially:

- `app/measurements/new/measurement-form.tsx`
- `app/measurements/page.tsx`
- `lib/measurements/actions.ts`
- `lib/measurements/validation.ts`
- `lib/measurements/action-state.ts`
- existing Supabase server-client infrastructure

Consult `DATABASE.md` only if a persisted field name or relationship creates a concrete ambiguity.

Do not read by default:

- `PROJECT.md`
- `README.md`
- `ROADMAP.md`
- unrelated specs

Do not inspect unrelated application code.

---

## Existing state

Already implemented:

- Next.js App Router application
- Supabase server/client infrastructure
- profile and location data access
- measurement creation form with validation
- measurement history page showing records for one selected profile
- centralized metric logic and shared validation patterns
- automated tests for metric calculations, measurement validation, and dashboard behavior

The application can already create and review measurements.

This specification adds the ability to change or remove a stored measurement row without creating a new record.

---

## Primary user flow

The user opens a measurement from the history list.

The application should allow them to:

1. view the measurement details in context
2. choose to edit it
3. update the measurement values and metadata
4. save the changes to Supabase
5. return to the historical measurement list
6. delete the measurement after confirmation

The feature should preserve the same data model, validation rules, and overall workflow established by the creation form and measurement history page.

---

## Route and navigation

Recommended route for editing:

```text
/measurements/[id]/edit
```

This route should load the selected measurement and prefill the form.

The page should also provide a clear path back to:

```text
/measurements
```

A helper link or cancellation path should return the user to the measurement history page without losing the selected profile context where practical.

The existing measurement creation route remains:

```text
/measurements/new
```

Do not replace or duplicate the creation form.

---

## Reusing the measurement form

The edit flow should reuse the existing measurement form as much as practical.

Required behavior:

- the same selector fields for profile and location should remain available
- the same measurement date/time behavior should be respected
- the same Tanita and circumference fields should be editable
- the same validation rules should apply to updates
- the form should render existing values as initial state

Prefer shared form logic over introducing a duplicate UI implementation.

If the form is split, the edit-specific path should still reuse the same field definitions and validation paths as the create flow.

This specification does not require redesigning the form layout.

---

## Loading existing measurement data

When visiting the edit route, the page must load the measurement row by `id` and ensure it belongs to an existing profile.

The edit page should load:

- selected measurement row
- all profiles for the selector
- all locations for the selector

The app should handle cases where:

- the measurement does not exist
- the measurement belongs to a profile no longer available
- the form cannot be populated because of a query or data error

In those cases, the app should show a clear error state and a safe fallback path back to the history list.

---

## Update semantics

The save action must update the stored measurement row in Supabase.

The update should preserve the existing database schema and use the same persisted column names as the creation flow.

The application must still enforce the same rules for:

- profile and location selection
- required measurement date
- optional time handling
- at least one body metric present
- validation of numeric ranges and values
- notes as optional text
- `entry_method` staying consistent with the measurement’s source semantics

For edit flows, the app should not allow a user to change `entry_method` manually.

The implementation should keep update logic centralized in the same server-action pattern already used for creating measurements.

---

## Delete semantics

The delete action must remove the selected measurement row from Supabase.

Delete behavior must include:

- a confirmation step before removal
- a clear user-visible confirmation message when deletion succeeds
- navigation back to measurement history after deletion
- safe handling when deletion fails

Prefer a confirmation pattern that confirms the measurement date and/or location before the delete request is submitted.

Do not silently delete on a single click.

This specification does not include bulk delete or soft delete.

---

## Data-access architecture

Prefer server-side loading for the edit view and server actions for update/delete requests.

Conceptually:

```text
Supabase
   ↓
selected measurement row
   ↓
pre-filled form state
   ↓
validation and save
   ↓
history return path
```

Database query logic should not be embedded directly inside large presentation components.

A reasonable structure is:

```text
app/measurements/[id]/edit/page.tsx
```

with shared logic in:

```text
lib/measurements/
```

This keeps the feature aligned with the repo’s current architecture and avoids unrelated refactors.

---

## Required server-side actions

The implementation should add or extend server actions for:

- fetching a measurement by id
- updating a measurement row
- deleting a measurement row

The update and delete actions should:

- use the Supabase server client
- validate the incoming request data before mutation
- return a clear status and useful error messaging on failure
- redirect or navigate back to the measurement history page after success

These actions should remain narrowly scoped to measurement editing and removal.

---

## Validation requirements

The update flow should reuse the existing measurement validation rules from the creation flow.

Validation should remain centralized and consistent with the current repository layer.

Specifically, it should still enforce:

- required profile selection
- required location selection
- required measurement date
- valid date/time combination
- valid numeric constraints for each metric
- optional field behavior for notes
- no silent coercion of invalid input

The same concerns should apply to edits as to new measurements.

---

## Error and success UX

The edit flow should provide:

- clear form-level error messages when validation fails
- a clear success confirmation after saving changes
- a clear error message when saving fails
- a clear confirmation step before delete
- a clear failure message if delete does not complete

The app should keep the current user’s entered values in place when validation fails rather than dropping them silently.

---

## Automated tests

The implementation must include automated tests for the new behavior.

Required test coverage should include:

- loading a measurement row for edit
- populating the form with the existing value set
- successful update to Supabase
- failed update handling and retained form state
- delete confirmation flow
- successful delete action
- delete error handling
- navigation back to measurement history after success

The tests should validate the real behavior of the code path and not only mock UI elements in isolation.

Where practical, tests should target a small, real logic boundary such as server-action behavior and page-level data shaping rather than broad UI snapshot tests.

Do not create tests that only assert a mock call happened without checking the real outcome.

---

## Non-goals for this specification

This specification does not include:

- charting or trend comparison views
- historical import workflows
- profile creation or editing
- location creation or editing
- auth or RLS setup
- deletion of related records outside the selected measurement
- medical interpretation of values
- any unrelated refactor or cleanup

---

## Acceptance criteria

The implementation is complete when all of the following are true:

1. A user can open an existing measurement and edit it.
2. The edit flow reuses the existing measurement form logic where practical.
3. The app persists the updated measurement to Supabase.
4. A user can confirm and delete a measurement.
5. The app removes the measurement row from Supabase.
6. After save or delete, the user can navigate back to measurement history.
7. The page handles missing or invalid measurement ids with a clear fallback.
8. Automated tests cover the update/delete flow and the key success/error cases.
