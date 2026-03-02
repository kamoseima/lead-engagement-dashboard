# Authentication & Roles

## Auth System

Uses Supabase Auth with email/password authentication. No self-signup — users are invited by admins.

## Invite Flow

1. Admin opens **Settings** page → enters email + role
2. POST to `/api/v1/auth/invite`
3. `supabase.auth.admin.inviteUserByEmail()` sends invite email
4. `dashboard_users` row created with role and org_id
5. Invitee clicks email link → redirected to `/auth/accept-invite`
6. Sets password via `supabase.auth.updateUser()`
7. Redirected to dashboard

## Session Management

- Sessions are managed by Supabase SSR (`@supabase/ssr`)
- The `proxy.ts` file refreshes sessions on each request
- Unauthenticated users are redirected to `/auth/login`
- API routes require a valid session (checked via `getClaims()`)

## Role Matrix

| Page | Admin | Agent |
|------|-------|-------|
| Dashboard | Yes | Yes |
| Templates | Yes | No |
| Flows | Yes | No |
| Campaigns | Yes | Yes |
| Testing | Yes | No |
| Settings | Yes | No |

## Implementation

### Server-side
- `lib/auth/roles.ts` provides `getCurrentUser()` and `requireRole()`
- API routes call these before executing business logic
- Returns `StepResult` with `UNAUTHORIZED` or `FORBIDDEN` error codes

### Client-side
- Dashboard layout fetches user profile from `dashboard_users`
- Sidebar component receives `userRole` prop, filters nav items
- Agent-restricted pages are hidden from navigation

### Proxy (Middleware)
- `proxy.ts` runs on every request
- Refreshes Supabase session cookies
- Redirects unauthenticated users to `/auth/login`
- Excludes `/auth/*` and `/api/*` routes from redirect
