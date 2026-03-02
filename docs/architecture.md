# Architecture

## Overview

Lead Engage is a production-level dashboard for managing WhatsApp lead engagement campaigns. Built with Next.js 15+ (App Router), Supabase (Postgres + Auth + Realtime), and Tailwind CSS.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                     │
│  ┌──────────────┬──────────┬──────────┬──────────────┐  │
│  │  Templates   │  Flows   │Campaigns │   Testing    │  │
│  └──────┬───────┴────┬─────┴────┬─────┴──────┬───────┘  │
└─────────┼────────────┼──────────┼────────────┼──────────┘
          │            │          │            │
          ▼            ▼          ▼            ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js API Routes (/api/v1/)              │
│  ┌──────────┬──────────┬──────────┬──────────────────┐  │
│  │templates │  flows   │campaigns │     tests        │  │
│  └────┬─────┴────┬─────┴────┬─────┴──────┬───────────┘  │
│       │          │          │            │               │
│       ▼          ▼          ▼            ▼               │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Services Layer                       │   │
│  │  template.service  flow.service  campaign.service │   │
│  │  test.service                                     │   │
│  └──────┬───────────────┬────────────────────────────┘   │
└─────────┼───────────────┼────────────────────────────────┘
          │               │
    ┌─────▼─────┐   ┌─────▼─────┐
    │  Platform  │   │ Supabase  │
    │    API     │   │ (Postgres)│
    │  (Twilio)  │   │           │
    └───────────┘   └───────────┘
```

## Layer Responsibilities

### Route Handlers (`app/api/v1/`)
- Parse requests, validate auth, call services, return responses
- Use `getCurrentUser()` / `requireRole()` for auth
- Map service results to HTTP responses via `toApiResponse()`

### Services (`services/`)
- Business logic, database queries, platform API calls
- Always return `StepResult<T>` (never throw)
- Stateless — create new Supabase client per request

### Shared Utilities (`lib/shared/`)
- `result.ts` — StepResult pattern, error codes, HTTP status mapping

### Platform API Client (`lib/platform-api.ts`)
- HTTP client for moludar-comms-platform
- Handles authentication, error mapping

## Data Flow

### Templates
Templates live in the platform API (Twilio). The dashboard reads and creates them via the platform API — no Supabase storage.

### Flows
Flows are stored in Supabase `flows` table as JSONB (V2 recursive format). Created and edited in the Flow Builder.

### Campaigns
Campaigns reference either a flow or a template. Leads are stored as JSONB array. Campaign sends are tracked individually in `campaign_sends`.

### Test Runs
Test scenarios can be built-in or custom (linked to a flow). Test runs record the message timeline as JSONB.

## Auth Flow

1. Admin invites user via Settings page → `supabase.auth.admin.inviteUserByEmail()`
2. Invitee receives email → clicks link → `/auth/accept-invite`
3. Sets password → `dashboard_users` row already created
4. On login, proxy middleware refreshes session
5. Dashboard layout fetches user profile + role from `dashboard_users`
6. Sidebar shows/hides nav items based on role

## Roles

| Role  | Access |
|-------|--------|
| admin | All pages: Templates, Flows, Campaigns, Testing, Settings |
| agent | Campaigns only |
