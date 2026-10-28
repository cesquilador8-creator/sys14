# MINDLOCK Supabase Setup

## 1) Create the project

1. In Supabase, create a new project.
2. Save the project URL and anon key.
3. Save the service role key only in the server-side environment and never in browser code.

## 2) Apply database migrations

Use the Supabase CLI:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

If you are using local development:

```bash
supabase start
supabase db reset
```

The migration files are located in:

- supabase/migrations/001_init_schema.sql
- supabase/migrations/002_backend_helpers.sql

## 3) Deploy the privileged backend function

From the root of the repo, deploy the edge function:

```bash
supabase functions deploy privileged-admin
```

Set environment variables in the Supabase project:

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

## 4) Configure app environment variables

Set these for the admin app and extension:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## 5) Set up the initial admin account

Create the first administrator securely through Supabase Auth in the dashboard or CLI, then mark the profile as follows:

- `can_access_admin = true`
- `role = 'administrator'`
- `account_status = 'active'`

Do not create a default admin account in code.

## 6) Secure invite and email provider

If you want the secure invitation flow for employee onboarding, configure a Supabase email provider and enable password-reset or invite emails.
