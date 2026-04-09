# RepCore

RepCore is a mobile-first gym management SaaS for independent Indian gyms. It is built for owner-led gyms that need a clean system for members, renewals, dues, attendance, receipts, and WhatsApp-led collections without enterprise bloat.

## Highlights

- Next.js 14 App Router application with responsive mobile-first UI
- Premium dark design system tuned for low-friction daily operations
- Supabase-backed auth, multi-tenant data model, RLS, and RPC-driven mutations
- Member lifecycle support: joins, renewals, rejoin, freeze, archive
- Billing model with invoices, partial payments, allocations, overpayment credit, and invoice correction
- Manual WhatsApp reminders for Basic and upgrade path for Growth automation
- Attendance logging with one check-in per member per day
- PWA-ready with manifest and service worker

## Stack

- Next.js 14
- React 18
- Tailwind CSS
- Supabase
- Shadcn-style UI primitives
- pdf-lib

## Product Scope

RepCore V1 includes:

- Email/password auth
- Onboarding for organization, gym, settings, and first plan
- Dashboard
- Member management
- Membership plans
- Subscriptions and renewals
- Billing and receipts
- Attendance
- WhatsApp reminders
- Reports
- Settings

## Pricing Model In Product

- Basic: INR 249/month
  - Manual WhatsApp reminders from the owner's own WhatsApp
- Growth: INR 449/month
  - Automated WhatsApp capability behind entitlement gating

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### 3. Run database migrations

Apply the Supabase SQL files in order:

1. `supabase/migrations/0001_repcore_v1.sql`
2. `supabase/migrations/0002_repcore_rpc_functions.sql`

### 4. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm run lint
npm run build
```

## Important Architecture Notes

- The database schema in `supabase/migrations/0001_repcore_v1.sql` is the source of truth.
- Multi-table business flows are implemented as database RPCs, not scattered client writes.
- Plan gating is centralized in entitlements config.
- Roles are enforced in both UI and server actions.

## Repository Structure

```text
app/                    Next.js routes and pages
components/             UI primitives, shared components, layout
lib/actions/            Server actions
lib/auth/               Session and auth helpers
lib/db/                 Read/query layer
lib/rpc/                RPC wrappers
lib/schemas/            Form validation schemas
lib/supabase/           Supabase clients and middleware
lib/utils/              Formatting and domain helpers
public/                 Static assets, icons, service worker
supabase/migrations/    Database schema and RPC migrations
```

## Status

RepCore V1 is build-clean and ready to connect to a live Supabase project.
