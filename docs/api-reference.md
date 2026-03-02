# API Reference

All API routes are under `/api/v1/`. Authentication is via Supabase session cookies.

## Auth

### POST `/api/v1/auth/invite`
Invite a new user (admin only).

**Body:**
```json
{ "email": "user@example.com", "role": "agent" }
```

**Response:** `201`
```json
{ "success": true, "data": { "email": "user@example.com", "role": "agent" } }
```

## Templates

### GET `/api/v1/templates`
List all templates from the platform API.

### POST `/api/v1/templates`
Create/deploy a new template (admin only).

**Body:**
```json
{
  "name": "welcome_message",
  "type": "text",
  "body": "Hi {{1}}, welcome to {{2}}!"
}
```

## Flows

### GET `/api/v1/flows`
List all flows for the current org.

### POST `/api/v1/flows`
Create a new flow (admin only).

**Body:**
```json
{
  "name": "Welcome Flow",
  "steps": [{ "template": "welcome_message", "label": "Initial" }]
}
```

### GET `/api/v1/flows/:id`
Get a single flow.

### PATCH `/api/v1/flows/:id`
Update a flow (admin only).

### DELETE `/api/v1/flows/:id`
Delete a flow (admin only).

## Campaigns

### GET `/api/v1/campaigns`
List all campaigns.

### POST `/api/v1/campaigns`
Create a new campaign.

**Body:**
```json
{
  "name": "March Outreach",
  "template_name": "welcome_message",
  "leads": [{ "name": "John", "phone": "+27821234567" }]
}
```

### GET `/api/v1/campaigns/:id`
Get campaign with sends.

## Tests

### GET `/api/v1/tests`
List test scenarios and recent runs (admin only).

### POST `/api/v1/tests`
Launch a test (admin only).

**Body:**
```json
{
  "scenarioId": "uuid",
  "leadName": "Test User",
  "leadPhone": "+27821234567",
  "templateName": "welcome_message",
  "contentSid": "HXabc123",
  "variables": { "1": "John", "2": "Afrihost" }
}
```

## Error Format

All errors follow the StepResult pattern:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description of the error",
    "details": {}
  }
}
```

Error codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `PROVIDER_ERROR` (502), `INTERNAL_ERROR` (500).
