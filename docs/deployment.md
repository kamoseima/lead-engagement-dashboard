# Deployment

## Prerequisites

- Node.js 18+
- pnpm 10+
- Supabase project (with Auth enabled)
- Vercel account (for hosting)

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Comms Platform
COMMS_API_BASE_URL=https://your-platform-api.com
COMMS_API_KEY=ck_live_xxxx
```

## Database Setup

### Run Migrations

Apply the SQL migrations in order:

```bash
supabase db push
# or manually run each file in supabase/migrations/
```

### Create First Admin

Since there's no self-signup, create the first admin manually:

1. Create a user in Supabase Auth dashboard
2. Insert a row in `dashboard_users`:
```sql
INSERT INTO dashboard_users (id, email, role, org_id)
VALUES ('auth-user-uuid', 'admin@company.com', 'admin', 'your-org-uuid');
```

## Local Development

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000

## Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel dashboard
3. Set environment variables
4. Deploy

## Vercel Configuration

The app uses the default Next.js configuration. No special Vercel config needed.

Set these environment variables in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COMMS_API_BASE_URL`
- `COMMS_API_KEY`
