# Deployment Guide

## Production deployment checklist

1. Prepare a Supabase project with environment-protected secrets.
2. Apply all migrations in `supabase/migrations/`.
3. Deploy each Edge Function in `supabase/functions/`.
4. Configure a secure initial administrator through the provisioning flow.
5. Set the admin website to use the live Supabase project URL and anon key.
6. Set the extension config to the same public project URL and anon key.
7. Validate all backend auth and RLS constraints before production rollout.

## Secure configuration

- Keep all service-role credentials in the Supabase project secret environment, never in the browser or source control.
- Update the admin and extension config values only with public-safe values.
- Add audit logging for employee creation, approval workflows, and device changes.
- Set a retention policy for usage records and tickets per company policy.

## Hosting

- Host the admin dashboard with a static web host or secure app server.
- Serve the site over HTTPS.
- Require valid Supabase session checks on all protected routes.

## Browser deployment

- Use Chrome or Edge enterprise-managed installs.
- Install the extension through the enterprise policy or manual developer mode during testing.
- Keep the extension update policy enforced through the company's managed browser configuration.
