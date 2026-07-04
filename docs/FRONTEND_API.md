# Biovity API - Frontend Reference

Base URL: `http://localhost:3001/api/v1`

All IDs are UUIDs. All dates are ISO 8601 strings.

---

## Authentication

> Not yet implemented. Endpoints are public.

When auth is added, send header:
```
Authorization: Bearer <jwt_token>
```

---

## Pagination

List endpoints return paginated results with this shape:

```json
{
  "data": [...],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

Query params: `page` (default 1), `limit` (default 10, max 100).

---

## Error Format

```json
{
  "statusCode": 404,
  "message": "Job not found",
  "error": "Not Found",
  "timestamp": "2026-01-15T10:30:00.000Z",
  "path": "/api/v1/jobs/123e4567-..."
}
```

---

## Swagger

Available in non-production environments at `/api/docs`.

---

## Enums Reference

| Enum | Values |
|------|--------|
| `JobStatus` | `draft`, `active`, `paused`, `closed`, `expired` |
| `JobEmploymentType` | `Full-time`, `Part-time`, `Contrato`, `Practica` |
| `JobExperienceLevel` | `Entrante`, `Junior`, `Mid-Senior`, `Senior`, `Ejecutivo` |
| `ApplicationStatus` | `pendiente`, `oferta`, `entrevista`, `rechazado`, `contratado` |
| `UserType` | `professional`, `organization` |
| `SubscriptionPlan` | `free`, `basic`, `premium`, `enterprise` |
| `PaymentStatus` | `pending`, `approved`, `rejected`, `cancelled` |
| `SkillLevel` | `advanced`, `intermediate`, `entry` |
| `LanguageLevel` | `advanced`, `intermediate`, `entry` |
| `EventType` | `interview`, `task_deadline`, `announcement`, `onboarding` |
| `EventStatus` | `scheduled`, `completed`, `cancelled` |
| `MessageType` | `text`, `file`, `audio`, `image`, `event` |
| `QuestionType` | `text`, `textarea`, `number`, `select`, `multiselect`, `boolean`, `date` |
| `QuestionStatus` | `draft`, `published` |

---

## Health

### `GET /health`
No params. Returns server status.

### `GET /health/database`
Returns database connectivity status.

---

## Jobs

### `POST /jobs`
Create a job.

**Body:**
```json
{
  "organizationId": "uuid (required)",
  "title": "string (required)",
  "description": "string (required)",
  "employmentType": "Full-time | Part-time | Contrato | Practica (required)",
  "experienceLevel": "Entrante | Junior | Mid-Senior | Senior | Ejecutivo (required)",
  "salary": {
    "min": "number",
    "max": "number",
    "currency": "string",
    "period": "string",
    "isNegotiable": "boolean"
  },
  "location": {
    "city": "string",
    "state": "string",
    "country": "string",
    "isRemote": "boolean",
    "isHybrid": "boolean"
  },
  "benefits": [
    { "tipo": "string (required)", "title": "string (required)" }
  ],
  "status": "draft | active | paused | closed | expired",
  "expiresAt": "ISO date string",
  "category": "string"
}
```

**Response:** `JobResponseDto` (201)

---

### `GET /jobs`
List jobs with filters and pagination.

**Query params:** `page`, `limit`, `organizationId` (uuid), `status` (enum), `search` (string), `category` (string)

**Response:** `Paginated<JobResponseDto>`

---

### `GET /jobs/:id`
Get job by ID. Returns 404 if not found.

**Response:** `JobResponseDto` (includes `totalApplications`)

---

### `GET /jobs/organization/:organizationId`
List jobs for an organization with pagination.

**Query params:** `page`, `limit`

**Response:** `Paginated<JobResponseDto>` (each item also has `applicationsCount`)

---

### `PUT /jobs/:id`
Update a job. All fields optional.

**Body:** Same as `JobCreateDto` but all fields optional.

**Response:** `JobResponseDto`

---

### `DELETE /jobs/:id`
Delete a job. Returns 204 no content.

---

### `PUT /jobs/:id/views`
Increment job view counter. Idempotent.

**Response:** `JobResponseDto`

---

## Applications

### `POST /applications`
Create an application.

**Body:**
```json
{
  "jobId": "uuid (required)",
  "candidateId": "uuid (required)",
  "coverLetter": "string (max 2000 chars)",
  "salaryMin": "number (min 0)",
  "salaryMax": "number (min 0)",
  "salaryCurrency": "string",
  "availabilityDate": "ISO date string",
  "resumeUrl": "string (url)",
  "answers": [
    { "questionId": "uuid (required)", "value": "string (required)" }
  ]
}
```

**Response:** `ApplicationResponseDto` (201)

---

### `GET /applications`
List applications with pagination.

**Query params:** `page`, `limit`, `jobId` (uuid), `candidateId` (uuid), `status` (enum), `includeAnswers` (boolean)

> **BREAKING:** `includeAnswers` is now a `boolean`. Previously was `string` which always evaluated to false. Pass `true` or `1` to get answers.

**Response:** `Paginated<ApplicationResponseDto>`

---

### `GET /applications/:id`
Get application by ID. Returns 404 if not found.

**Response:** `ApplicationResponseDto`

---

### `GET /applications/job/:jobId`
List applications for a job. Supports pagination.

**Query params:** `page`, `limit`, `includeAnswers` (boolean)

**Response:** `Paginated<ApplicationResponseDto>`

---

### `GET /applications/candidate/:candidateId`
List applications for a candidate. Supports pagination.

**Query params:** `page`, `limit`

**Response:** `Paginated<ApplicationResponseDto>`

---

### `GET /applications/organization/:organizationId`
List applications for an organization. Supports pagination.

**Query params:** `page`, `limit`, `includeAnswers` (boolean)

**Response:** `Paginated<ApplicationResponseDto>`

---

### `PUT /applications/:id/status`
Update application status.

**Body:**
```json
{
  "status": "pendiente | oferta | entrevista | rechazado | contratado (required)"
}
```

**Response:** `ApplicationResponseDto`

---

### `DELETE /applications/:id`
Delete an application. Returns 204 no content.

---

## Users

### `GET /users`
List users with filters and pagination.

**Query params:** `page`, `limit`, `type` (professional | organization), `isActive` (boolean), `search` (string)

**Response:** `Paginated<UserResponseDto>`

---

### `GET /users/:id`
Get user by ID. Returns 404 if not found.

**Response:** `UserResponseDto`

---

### `GET /users/email/:email`
Get user by email. Returns 404 if not found.

**Response:** `UserResponseDto`

---

### `PUT /users/:id`
Update a user. All fields optional.

**Body:**
```json
{
  "name": "string",
  "type": "professional | organization",
  "isEmailVerified": "boolean",
  "isActive": "boolean",
  "organizationId": "uuid",
  "avatar": "string (url)",
  "profession": "string",
  "birthday": "string",
  "phone": "string",
  "location": {
    "city": "string",
    "country": "string",
    "street": "string"
  }
}
```

**Response:** `UserResponseDto`

---

### `POST /users/:id/views`
Increment user profile views. Idempotent.

**Response:** `{ "views": number }`

---

### `GET /users/:id/metrics`
Get user analytics/metrics.

**Query params:** `period` (week | month | year, default: month)

**Response:**
```json
{
  "quickMetrics": {
    "totalApplications": 15,
    "activeApplications": 8,
    "responseRate": 45
  },
  "kpis": {
    "applicationsLast30Days": 12,
    "responseRate": 35,
    "interviews": 4,
    "offers": 1,
    "avgResponseTimeDays": 5.2,
    "profileViews": 42
  },
  "applicationsTrend": [
    { "month": "2024-01", "applications": 5 }
  ],
  "responseTimeDistribution": {
    "lessThan24h": 3,
    "oneToThreeDays": 5,
    "threeToSevenDays": 4,
    "moreThanSevenDays": 3
  },
  "hiringFunnel": {
    "aplicado": { "count": 50, "percentage": 100 },
    "entrevista": { "count": 20, "percentage": 40 },
    "oferta": { "count": 5, "percentage": 10 },
    "contratado": { "count": 2, "percentage": 4 }
  },
  "industriesApplied": [
    { "industry": "Tech", "count": 8, "percentage": 40 }
  ],
  "upcomingInterviews": [
    {
      "eventId": "uuid",
      "title": "Entrevista tecnica",
      "startAt": "2024-01-20T10:00:00Z",
      "jobId": "uuid",
      "jobTitle": "Backend Developer",
      "organizationId": "uuid",
      "organizationName": "Tech Corp"
    }
  ],
  "recentApplications": [
    {
      "applicationId": "uuid",
      "jobTitle": "Backend Developer",
      "organizationName": "Tech Corp",
      "status": "pendiente",
      "appliedAt": "2024-01-15"
    }
  ]
}
```

---

## Organizations

### `POST /organizations`
Create an organization.

**Body:**
```json
{
  "name": "string (required)",
  "website": "string (required)",
  "phone": "string",
  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "country": "string",
    "zipCode": "string"
  }
}
```

**Response:** `OrganizationResponseDto` (201)

---

### `GET /organizations`
List all organizations. No pagination.

**Response:** `OrganizationResponseDto[]`

---

### `GET /organizations/:id`
Get organization by ID. Returns 404 if not found.

**Response:** `OrganizationResponseDto`

---

### `PUT /organizations/:id`
Update an organization. All fields optional.

**Body:** Same as create but all fields optional.

**Response:** `OrganizationResponseDto`

---

### `DELETE /organizations/:id`
Delete an organization. Returns 204 no content.

---

### `GET /organizations/:id/metrics`
Get organization analytics/metrics.

**Query params:** `period` (week | month | year, default: month)

**Response:**
```json
{
  "dashboard": {
    "activeJobs": 5,
    "pendingApplications": 12,
    "interviewsThisPeriod": 3,
    "interviewsTrend": 15,
    "applicationsTrend": 8
  },
  "pipeline": {
    "totalApplications": 11,
    "byStatus": {
      "pendiente": 5,
      "oferta": 2,
      "entrevista": 3,
      "rechazado": 1,
      "contratado": 0
    },
    "conversionRate": 27
  },
  "topJobs": [
    {
      "jobId": "uuid",
      "jobTitle": "Backend Developer",
      "views": 150,
      "applications": 12,
      "applicationRate": 8
    }
  ],
  "recentTrend": [
    { "date": "2024-01-15", "applications": 3, "interviews": 1 }
  ],
  "geographicDistribution": [
    { "city": "Santiago", "count": 25, "percentage": 35 }
  ],
  "avgHiringTimeDays": 12.5
}
```

---

## Resumes

### `POST /resumes`
Create a resume.

**Body:**
```json
{
  "userId": "uuid (required)",
  "summary": "string",
  "experiences": [
    {
      "title": "string (required)",
      "startYear": "string (required)",
      "endYear": "string",
      "stillWorking": "boolean",
      "company": "string",
      "description": "string"
    }
  ],
  "education": [
    {
      "title": "string (required)",
      "startYear": "string (required)",
      "endYear": "string",
      "stillStudying": "boolean",
      "institute": "string"
    }
  ],
  "skills": [
    { "name": "string (required)", "level": "advanced | intermediate | entry" }
  ],
  "certifications": [
    { "title": "string (required)", "date": "string", "link": "string", "company": "string" }
  ],
  "languages": [
    { "name": "string (required)", "level": "advanced | intermediate | entry" }
  ],
  "links": [
    { "url": "string" }
  ],
  "cvFile": {
    "url": "string (required)",
    "originalName": "string",
    "mimeType": "string",
    "size": "number"
  }
}
```

**Response:** `ResumeResponseDto` (201)

---

### `GET /resumes/:id`
Get resume by ID. Returns 404 if not found.

**Response:** `ResumeResponseDto`

---

### `GET /resumes/user/:userId`
Get resume by user ID. Returns 404 if not found.

**Response:** `ResumeResponseDto`

---

### `GET /resumes`
List all resumes. No pagination.

**Response:** `ResumeResponseDto[]`

---

### `PUT /resumes/:id`
Update a resume. All fields optional.

**Body:** Same as create but all fields optional.

**Response:** `ResumeResponseDto`

---

### `DELETE /resumes/:id`
Delete a resume. Returns 204 no content.

---

## Subscriptions

### `GET /subscription`
Get subscription by organization ID.

**Query params:** `organizationId` (uuid, required)

**Response:**
```json
{
  "subscription": {
    "id": "uuid",
    "organizationId": "uuid",
    "planName": "free | basic | premium | enterprise",
    "isActive": true,
    "startedAt": "ISO date | null",
    "expiresAt": "ISO date | null",
    "payment_status": "pending | approved | rejected | cancelled | null",
    "features": {
      "maxJobs": 5,
      "maxApplications": 20,
      "featuredJobs": 0,
      "prioritySupport": false,
      "analyticsDashboard": false,
      "apiAccess": false
    }
  }
}
```

> Note: `subscription` can be `null` if none exists.

---

### `POST /subscription/preference`
Create MercadoPago payment preference.

**Body:**
```json
{
  "plan": "string (required, e.g. 'pro')",
  "organizationId": "uuid (required)"
}
```

**Response (201):**
```json
{
  "preferenceId": "pref-xxx-xxx",
  "initPoint": "https://www.mercadopago.com/...",
  "plan": "pro",
  "price": 40000
}
```

---

### `POST /subscription/webhook`
MercadoPago webhook endpoint (called by MercadoPago, not frontend).

**Query params:** `topic` (string, e.g. `payment`)

**Response:** `{ "received": true }`

---

## Events

### `POST /events`
Create an event.

**Body:**
```json
{
  "title": "string (required)",
  "description": "string",
  "type": "interview | task_deadline | announcement | onboarding (required)",
  "startAt": "ISO date string (required)",
  "endAt": "ISO date string",
  "location": "string",
  "meetingUrl": "string",
  "organizerId": "uuid (required)",
  "organizationId": "uuid",
  "candidateId": "uuid",
  "applicationId": "uuid"
}
```

**Response:** `EventResponseDto` (201)

---

### `GET /events`
List events with filters and pagination.

**Query params:** `page` (default 1), `limit` (default 10), `userId` (uuid), `organizerId` (uuid), `organizationId` (uuid), `candidateId` (uuid), `type` (enum), `status` (enum), `from` (ISO date), `to` (ISO date), `applicationId` (uuid)

> **BREAKING:** `status` is now an enum: `scheduled | completed | cancelled`. Previously was a free string.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Entrevista tecnica",
      "description": "string | null",
      "type": "interview | task_deadline | announcement | onboarding",
      "startAt": "ISO date",
      "endAt": "ISO date | null",
      "location": "string | null",
      "meetingUrl": "string | null",
      "status": "scheduled | completed | cancelled",
      "organizerId": "uuid",
      "organizationId": "uuid | null",
      "candidateId": "uuid | null",
      "applicationId": "uuid | null",
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

---

### `GET /events/:id`
Get event by ID. Returns 404 if not found.

**Response:** `EventResponseDto`

---

### `PATCH /events/:id`
Update an event. All fields optional.

**Body:** Same as create but all fields optional. Also accepts `status` (enum).

**Response:** `EventResponseDto`

---

### `DELETE /events/:id`
Delete an event. Returns 204 no content.

---

### `POST /events/:id/notes`
Add a note to an event.

**Body:**
```json
{
  "content": "string (required)",
  "authorId": "uuid (required)"
}
```

**Response:**
```json
{
  "id": "uuid",
  "eventId": "uuid",
  "authorId": "uuid",
  "content": "string",
  "createdAt": "ISO date"
}
```

---

### `GET /events/:id/notes`
Get all notes for an event.

**Response:** `EventNoteResponseDto[]`

---

## Chats

### `POST /chats`
Create a chat.

**Body:**
```json
{
  "recruiterId": "uuid (required)",
  "professionalId": "uuid (required)",
  "lastMessage": "string"
}
```

**Response:**
```json
{
  "id": "uuid",
  "recruiterId": "uuid",
  "professionalId": "uuid",
  "lastMessage": "string | null",
  "unreadCountRecruiter": 0,
  "unreadCountProfessional": 0,
  "createdAt": "ISO date",
  "updatedAt": "ISO date | null"
}
```

---

### `GET /chats/:id`
Get chat by ID. Returns 404 if not found.

**Response:** `ChatResponseDto`

---

### `GET /chats/recruiter/:recruiterId`
List chats for a recruiter.

**Response:** `ChatResponseDto[]`

---

### `GET /chats/professional/:professionalId`
List chats for a professional.

**Response:** `ChatResponseDto[]`

---

### `GET /chats/participants/:recruiterId/:professionalId`
Get chat between specific participants. Returns 404 if not found.

**Response:** `ChatResponseDto`

---

### `PUT /chats/:id`
Update a chat. All fields optional.

**Body:**
```json
{
  "lastMessage": "string",
  "recruiterId": "uuid",
  "professionalId": "uuid"
}
```

**Response:** `ChatResponseDto`

---

### `DELETE /chats/:id`
Delete a chat. Returns 204 no content.

---

## Messages

### `POST /messages`
Create a message.

**Body:**
```json
{
  "chatId": "uuid (required)",
  "senderId": "uuid (required)",
  "content": "string (required)",
  "type": "text | file | audio | image | event",
  "contentType": "object (type-specific metadata)"
}
```

**Response:**
```json
{
  "id": "uuid",
  "chatId": "uuid",
  "senderId": "uuid",
  "content": "string",
  "type": "text | file | audio | image | event",
  "contentType": "object | null",
  "isRead": false,
  "createdAt": "ISO date"
}
```

---

### `GET /messages/:id`
Get message by ID. Returns 404 if not found.

**Response:** `MessageResponseDto`

---

### `GET /messages/chat/:chatId`
List messages for a chat.

**Response:** `MessageResponseDto[]`

---

### `PUT /messages/:id/read`
Mark a single message as read.

**Response:** `MessageResponseDto`

---

### `PUT /messages/chat/:chatId/read`
Mark all messages in a chat as read for a user.

**Body:**
```json
{
  "userId": "uuid (required)"
}
```

**Response:** 204 no content.

---

### `DELETE /messages/:id`
Delete a message. Returns 204 no content.

---

## Saved Jobs

### `POST /saved-jobs`
Save a job.

**Body:**
```json
{
  "userId": "uuid (required)",
  "jobId": "uuid (required)"
}
```

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "jobId": "uuid",
  "createdAt": "ISO date",
  "job": {
    "id": "uuid",
    "title": "string",
    "organizationId": "uuid",
    "status": "string"
  }
}
```

---

### `GET /saved-jobs/user/:userId`
List saved jobs for a user. Supports pagination.

**Query params:** `page`, `limit`

**Response:** `Paginated<SavedJobResponseDto>`

---

### `GET /saved-jobs/job/:jobId`
List saved entries for a job. Supports pagination.

**Query params:** `page`, `limit`

**Response:** `Paginated<SavedJobResponseDto>`

---

### `GET /saved-jobs/check/:userId/:jobId`
Check if a user has saved a job.

**Response:**
```json
{ "isSaved": true }
```

---

### `GET /saved-jobs/:id`
Get saved job by ID. Returns 404 if not found.

**Response:** `SavedJobResponseDto`

---

### `DELETE /saved-jobs/:id`
Unsave by saved-job ID. Returns 204 no content.

---

### `DELETE /saved-jobs/user/:userId/job/:jobId`
Unsave by user+job pair. Returns 204 no content.

---

## Job Questions

### `GET /jobs/:jobId/questions`
Get published questions for a job (public).

**Response:** `QuestionResponseDto[]`

---

### `GET /organizations/:organizationId/jobs/:jobId/questions`
Get all questions for a job (org owner view, includes drafts).

**Response:** `QuestionResponseDto[]`

---

### `POST /organizations/:organizationId/jobs/:jobId/questions`
Create a question for a job.

**Body:**
```json
{
  "label": "string (required, minLength: 1)",
  "placeholder": "string",
  "helperText": "string",
  "type": "text | textarea | number | select | multiselect | boolean | date (required)",
  "options": ["string"]  // required for select/multiselect
  "required": "boolean",
  "orderIndex": "number (min 0)",
  "status": "draft | published"
}
```

**Response:** `QuestionResponseDto` (201)

---

### `PUT /jobs/questions/:id`
Update a question. All fields optional.

**Body:** Same as create but all fields optional.

**Response:** `QuestionResponseDto`

---

### `PATCH /jobs/questions/:id/publish`
Publish a question.

**Response:** `QuestionResponseDto`

---

### `PATCH /jobs/questions/:id/unpublish`
Unpublish a question (set to draft).

**Response:** `QuestionResponseDto`

---

### `PATCH /organizations/:organizationId/jobs/:jobId/questions/reorder`
Reorder questions for a job.

**Body:**
```json
{
  "items": [
    { "id": "uuid (required)", "orderIndex": "number (min 0, required)" }
  ]
}
```

**Response:** `QuestionResponseDto[]` (reordered list)

---

### `DELETE /jobs/questions/:id`
Delete a question. Returns 204 no content.

---

## API Keys

### `POST /organizations/:orgId/api-keys`
Create an API key.

**Body:**
```json
{
  "name": "string (required)",
  "scopes": ["string"],  // e.g. ["mcp:read", "jobs:search"]
  "expiresAt": "ISO date string"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Production MCP Key",
  "key": "bvty_live_abc123...",  // only shown once
  "keyPrefix": "bvty_live_...",
  "scopes": ["mcp:read"],
  "createdAt": "ISO date"
}
```

> **IMPORTANT:** The `key` value is only returned on creation. Store it securely.

---

### `GET /organizations/:orgId/api-keys`
List all API keys for an organization. Keys are masked.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Production MCP Key",
    "scopes": ["mcp:read"],
    "lastUsedAt": "ISO date | null",
    "expiresAt": "ISO date | null",
    "revokedAt": "ISO date | null",
    "createdAt": "ISO date"
  }
]
```

---

### `DELETE /organizations/:orgId/api-keys/:keyId`
Revoke an API key.

**Response:**
```json
{ "revoked": true }
```

---

## Admin

### `GET /admin/stats`
Get platform statistics.

**Response:**
```json
{
  "users": {
    "total": 1240,
    "professionals": 900,
    "organizations": 340,
    "active": 1100,
    "inactive": 140,
    "recentCount": 45,
    "recentTrend": 12
  },
  "waitlist": {
    "total": 89,
    "professionals": 67,
    "organizations": 22
  },
  "platform": {
    "activeJobs": 342,
    "totalApplications": 1500,
    "totalOrganizations": 340
  }
}
```

---

### `GET /admin/analytics/registrations`
User registration trend.

**Query params:** `period` (30 | 90, default: 30)

**Response:**
```json
{
  "data": [
    { "date": "2026-05-01", "professionals": 12, "organizations": 3 }
  ],
  "totals": { "professionals": 284, "organizations": 67 }
}
```

---

### `GET /admin/analytics/top-jobs`
Top jobs by application count.

**Query params:** `limit` (1-50, default: 10)

**Response:**
```json
{
  "data": [
    {
      "jobId": "uuid",
      "title": "Investigador/a en Biotecnologia",
      "organizationName": "LabChile SpA",
      "applications": 47,
      "views": 1203,
      "applicationRate": 4
    }
  ]
}
```

---

### `GET /admin/analytics/applications-trend`
Application trend over time.

**Query params:** `period` (30 | 90, default: 30)

**Response:**
```json
{
  "data": [
    { "date": "2026-05-01", "count": 8 }
  ],
  "total": 234
}
```

---

### `GET /admin/health/detailed`
Detailed server health check.

**Response:**
```json
{
  "status": "ok | degraded",
  "timestamp": "ISO date",
  "latencyMs": 12,
  "checks": {
    "database": {
      "status": "up | down",
      "message": "optional string",
      "error": "optional string"
    }
  }
}
```

---

## Breaking Changes (from previous version)

1. **`ApplicationQueryDto.includeAnswers`** changed from `string` to `boolean`. Previously `"true"` string always evaluated to `false` due to a bug. Now pass `true` (boolean) or `1` (number).

2. **All list endpoints** now return paginated responses: `{ data, total, page, limit, totalPages }`. Previously returned bare arrays on some endpoints.

3. **All GET-by-id endpoints** now return proper 404 JSON errors instead of empty body or 200 with null.

4. **Update endpoints** now require properly typed DTOs. Sending partial/loose objects may be rejected by validation.

5. **`EventQueryDto.status`** is now an enum (`scheduled | completed | cancelled`), not a free-form string.

6. **Swagger docs** only available in non-production environments at `/api/docs`.

7. **Error responses** follow `{ statusCode, message, error, timestamp, path }` format globally.

---

*Generated from source code. Last updated: 2026-06-26*
