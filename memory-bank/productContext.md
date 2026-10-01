# Product context

## User model and domains

The product revolves around a few core domain concepts:

- profiles: a user’s personal tracking identity;
- locations: a measurement context such as a home or clinic location;
- measurements: a recorded body-data event tied to a profile and a location.

The domain model is implemented in the database schema and the measurement validation logic. A measurement can be partial: not every metric is required, and fields may be absent without being treated as zero.

## Behavioral decisions reflected in code

- Missing metric values are represented as `null`, not `0`.
- Measurements are associated with a profile and a location, and those associations are protected by ownership checks.
- The history, dashboard and trend views operate from the same underlying set of measurement records.
- A measurement has a recorded timestamp, optional notes, and optional numeric fields for body metrics.
- The app surfaces dashboard summaries as deltas from the first and previous values in a metric history.

## Functional areas currently in the repo

### Dashboard
The dashboard currently summarizes selected metric history and renders current/previous/first values. The logic is centralized in `lib/dashboard/data.ts` and the metric calculations in `lib/metrics/`.

### Measurement history
Records are listed with date, location, notes and metric details. The history page also supports navigation to edit a selected measurement.

### Editing and deletion
Create, update and delete behaviors are implemented as server actions and are protected by authentication and authorization checks.

### Trends
Trend pages compute a time-ordered series for selected fields and render chart-ready data.

### Historical import
The app supports CSV and XLSX historical import with preview, validation, duplicate detection and explicit override decisions before commit.

### Authentication
The app supports sign-in, invitation callback handling, password setup, sign-out and protected route redirects.

For the full normative rules, see `.agents/rules/measurement-domain.md`, `.agents/rules/auth-and-ownership.md`, and `.agents/rules/historical-import.md`.
