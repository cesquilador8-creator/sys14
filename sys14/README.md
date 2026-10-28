# SYS14

SYS14 is a company-managed distraction-control platform that combines a browser extension, employee support tooling, and an administrator portal backed by Supabase.

## What is included

- Admin portal in [admin](admin)
- Browser extension in [extension](extension)
- Supabase schema and security policies in [supabase/migrations](supabase/migrations)
- Edge functions in [supabase/functions](supabase/functions)
- Policy and compliance notes in [docs](docs)

## Required environment

Before using the app, configure a real Supabase project and add values to a local environment file based on [.env.example](.env.example).

Required values:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- ADMIN_EMAIL
- ADMIN_PASSWORD

## Backend setup

1. Create a Supabase project.
2. Run the migration:
   - `supabase db push --include-all --db-url ...`
3. Deploy the edge functions from [supabase/functions](supabase/functions):
   - `supabase functions deploy provision-admin`
   - `supabase functions deploy register-laptop`
   - `supabase functions deploy get-blocking-config`
   - `supabase functions deploy create-employee`
   - `supabase functions deploy create-ticket`
   - `supabase functions deploy submit-usage-event`
   - `supabase functions deploy manage-laptop-change`
4. Set the required environment variables in the Supabase project settings.

## Admin portal

The admin UI is intentionally configured to stop with a clear message until valid Supabase credentials are supplied. That prevents the app from silently running against fake placeholder values.

## Extension

The browser extension is configured for Manifest V3 and will enforce blocking only when the device is enrolled and a valid config is present.

## Security notes

- No credentials are stored in browser source files.
- Row-level security is enforced in the database.
- Server-side provisioning and privileged actions are intended to run only through Supabase Edge Functions.

## Important limitation

This repository cannot function as a live system until the project is connected to a real Supabase instance with valid credentials and the database migration is applied.
