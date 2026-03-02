# Database Schema

## Tables

### `dashboard_users`
User profiles linked to Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK, FK auth.users) | Auth user ID |
| email | text | User email |
| display_name | text | Display name |
| role | user_role enum | `admin` or `agent` |
| org_id | uuid | Organization ID |
| invited_by | uuid (FK dashboard_users) | Who invited this user |
| created_at | timestamptz | Created timestamp |
| updated_at | timestamptz | Updated timestamp |

### `flows`
Message flows with V2 recursive step format.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Flow ID |
| org_id | uuid | Organization ID |
| name | text | Flow name |
| description | text | Description |
| steps | jsonb | V2 recursive FlowStep[] |
| fallback | jsonb | Fallback config |
| created_by | uuid (FK dashboard_users) | Creator |
| created_at | timestamptz | Created timestamp |
| updated_at | timestamptz | Updated timestamp |

### `campaigns`
Campaign definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Campaign ID |
| org_id | uuid | Organization ID |
| name | text | Campaign name |
| description | text | Description |
| flow_id | uuid (FK flows) | Linked flow |
| template_name | text | Direct template name |
| status | campaign_status enum | draft/scheduled/sending/completed/paused/failed |
| leads | jsonb | Array of CampaignLead |
| schedule_at | timestamptz | Scheduled send time |
| config | jsonb | Additional config |
| created_by | uuid (FK dashboard_users) | Creator |

### `campaign_sends`
Individual send records per lead.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Send ID |
| campaign_id | uuid (FK campaigns) | Parent campaign |
| org_id | uuid | Organization ID |
| lead_name | text | Lead name |
| lead_phone | text | Lead phone number |
| template_name | text | Template used |
| variables | jsonb | Template variables |
| status | send_status enum | pending/queued/sent/delivered/failed/replied |
| provider_message_id | text | Twilio message SID |
| idempotency_key | text (unique) | Idempotency key |
| error | text | Error message if failed |
| sent_at | timestamptz | When sent |

### `test_scenarios`
Test scenario definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Scenario ID |
| org_id | uuid | Organization ID |
| name | text | Scenario name |
| description | text | Description |
| flow_id | uuid (FK flows) | Linked flow |
| template_name | text | Direct template |
| is_builtin | boolean | Built-in scenario flag |
| config | jsonb | Additional config |
| created_by | uuid (FK dashboard_users) | Creator |

### `test_runs`
Test execution records.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Run ID |
| scenario_id | uuid (FK test_scenarios) | Parent scenario |
| org_id | uuid | Organization ID |
| lead_name | text | Test lead name |
| lead_phone | text | Test phone number |
| status | test_run_status enum | running/waiting_reply/completed/failed/timeout |
| messages | jsonb | Message timeline array |
| template_name | text | Template used |
| variables | jsonb | Variables used |

## RLS Policies

All tables enforce Row-Level Security scoped by `org_id`:
- **Read**: All org members can read rows in their org
- **Write (admin)**: Admins can create/update/delete
- **Write (agent)**: Agents can create campaign sends only
- Built-in test scenarios are readable by all users

## Enums

- `user_role`: `admin`, `agent`
- `campaign_status`: `draft`, `scheduled`, `sending`, `completed`, `paused`, `failed`
- `send_status`: `pending`, `queued`, `sent`, `delivered`, `failed`, `replied`
- `test_run_status`: `running`, `waiting_reply`, `completed`, `failed`, `timeout`
