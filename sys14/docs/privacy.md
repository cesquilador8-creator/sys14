# Employee Privacy Notice

The SYS14 system is designed to support approved productivity management for company-managed devices only.

## What data is collected

- Employee account metadata required for authentication and authorization
- Laptop assignment and device enrollment status
- Scheduled blocking configuration assignments
- Approved usage metadata necessary for per-day and per-week analytics
- Support ticket details submitted by employees or IT staff
- Audit logs for changes to device assignment, approval queues, and admin actions

## What is not collected

- Website passwords or account credentials
- Keystrokes
- Page text or form contents
- Arbitrary personal browsing data outside the approved usage metadata scope

## Data handling

- Data is stored in Supabase PostgreSQL with authentication and RLS enforcement.
- Employees access only their own records and authorized ticket data.
- Internal notes are kept separate from employee-visible messages.
- Historical records are retained according to the company's documented retention policy.

## Limits of browser-based measurement

Browser extensions can measure usage metadata such as domain visits and blocking events, but they cannot always determine exact time spent on every page with full precision. Results should be treated as operational usage indicators rather than exact digital surveillance.
