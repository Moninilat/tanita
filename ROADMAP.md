# Roadmap

This document tracks implementation progress and planned work for the Tanita application.

## Current status

- Next.js app exists in the repository root-level app/ directory
- Supabase project is configured and linked
- the initial migration has already been applied
- profiles, locations, and measurements exist in the remote database
- the current application-level Supabase integration has not been implemented

## Current phase

### Phase 4 - Supabase application integration

This is the next immediate phase.

Planned work:

- install the Supabase JavaScript client if needed
- configure environment variables safely
- create reusable browser and server clients as appropriate
- never expose a service-role credential to browser code
- verify the app can read development data from Supabase
- create TypeScript database and domain types

## Upcoming phases

### Phase 5 - Domain metric engine

- body fat mass
- waist-to-hip ratio
- BMI
- change from first non-null measurement
- change from previous non-null measurement

### Phase 6 - Tests

- unit tests for metric calculations
- multiple-measurement cases
- null-handling cases
- historical insert/edit/delete behavior
- percentage-point calculations

### Phase 7 - Measurement form

- profile selection
- date/time
- location
- Tanita metrics
- manual circumference metrics
- notes

### Phase 8 - Dashboard

- weight
- body fat percentage
- body fat mass
- muscle mass
- waist
- waist-to-hip ratio

### Phase 9 - History

- chronological record display
- filters
- editing
- deleting
- profile filtering
- location filtering

### Phase 10 - Charts

- historical charts for selected metrics

### Phase 11 - Historical Excel import

- controlled import flow
- entry_method = import
- validation against historical spreadsheet values

### Phase 12 - Authentication and security

- Supabase Auth
- ownership and access design
- RLS policies
- production-safe environment handling

### Phase 13 - Deployment

- Next.js deployment to Vercel
- production Supabase configuration
- mobile validation
- backup/export strategy

## Notes

This roadmap is not a product specification. It is intended to track active work and future delivery phases for the project.