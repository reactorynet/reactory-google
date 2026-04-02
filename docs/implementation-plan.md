# Reactory Google Module — Implementation Plan

> This plan is designed for execution by an AI agent. Each phase and step contains the exact file paths, code patterns, imports, and structural details needed to implement without ambiguity. Refer to `specification.md` in this directory for the full functional specification.

---

## Conventions & Reference

### Module Identity
- **Module ID**: `reactory-google`
- **Namespace**: `google`
- **Version**: `1.0.0`
- **Service FQN pattern**: `google.{ServiceName}@1.0.0`

### Import Aliases (from `tsconfig.json` paths)
```typescript
import Reactory from '@reactorynet/reactory-core';
import { service } from '@reactory/server-core/application/decorators/service';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';
import { loadGraphQLTypeDefinitions } from '@reactory/server-core/graph/graphql-loader';
import { mergeGraphResolver } from '@reactory/server-core/utils';
import logger from '@reactory/server-core/logging';
import ApiError from '@reactory/server-core/exceptions';
import ReactoryContextProvider from '@reactory/server-core/context/ReactoryContextProvider';
```

### Existing Services Referenced as Dependencies
| FQN | Alias | Purpose |
|---|---|---|
| `core.RedisService@1.0.0` | `redisService` | All caching + ephemeral state |
| `core.ReactoryFileService@1.0.0` | `fileService` | Attachment storage |
| `core.ReactoryAuditService@1.0.0` | `auditService` | Audit logging |
| `core.UserService@1.0.0` | `userService` | User lookup |
| `reactory.QueueProvider@1.0.0` | `queueProvider` | Queue job management |

### Data Layer
- **ORM**: Mongoose (MongoDB)
- **Pattern**: Define interface → define Schema → export Model + interface
- **Collection naming**: `google_{entity}` (e.g. `google_tokens`, `google_sync_states`)

### Module Registration
The module does **not** manually edit `src/modules/__index.ts` — it is auto-generated on server startup from `available.json`. Add the module entry to `src/modules/available.json` and the module directory; the server will pick it up.

### Approach
- **TDD**: Follow Test Driven Development methodologies where appropriate. All code needs to be tested and verfied
- **git**: Make use of git to create phase branches from the main before starting a phase, only merge to main when the phase is complete and working.
- **progress**: Update this file as you complete a phase / large section.
---

## Phase 0 — Project Scaffolding

### Step 0.1: Create `package.json`

**File**: `reactory-google/package.json`

```json
{
  "name": "@reactory/reactory-google",
  "version": "1.0.0",
  "description": "Reactory Google Workspace integration module — Gmail, Calendar, Drive, Docs, Sheets, Contacts, Tasks",
  "main": "index.ts",
  "keywords": ["google", "workspace", "gmail", "calendar", "drive", "sheets", "contacts", "reactory"],
  "author": "Reactory Team",
  "license": "MIT",
  "dependencies": {
    "googleapis": "^140.0.1",
    "google-auth-library": "^9.14.1"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "typescript": "^5.5.0"
  }
}
```

Run `cd reactory-google && yarn install`.

### Step 0.2: Create directory skeleton

Create the following empty directories (each with an `index.ts` stub that exports an empty array or empty object as appropriate):

```
reactory-google/
├── services/index.ts          → export default [] as Reactory.Service.IReactoryServiceDefinition<any>[]
├── models/index.ts            → export default [] as Reactory.IReactoryComponentDefinition<any>[]
├── graphql/
│   ├── index.ts               → export default { Types: [], Resolvers: {} }
│   ├── types/index.ts         → export default []
│   └── resolvers/index.ts     → export default {}
├── forms/index.ts             → export default [] as Reactory.Forms.IReactoryForm[]
├── routes/index.ts            → export default express.Router()
├── workflows/index.ts         → export default [] as Reactory.Workflow.IWorkflow[]
├── queues/index.ts            → export empty object
├── middleware/index.ts        → export default []
├── cli/index.ts               → export default []
├── ai/
│   ├── index.ts               → export { GOOGLE_MACROS, GoogleWorkspacePersona } + default
│   ├── macros/index.ts        → export const GOOGLE_MACROS = []; export default GOOGLE_MACROS;
│   └── persona/
│       └── GoogleWorkspaceAssistant/
│           └── GoogleWorkspacePersona.ts → placeholder persona export
├── types/index.ts             → re-export all type files
├── utils/index.ts             → re-export all utils
├── data/                      → static JSON files (added in later steps)
├── i18n/en.json               → {}
└── docs/                      → already exists (specification.md, this file)
```

### Step 0.3: Create module entry `index.ts`

**File**: `reactory-google/index.ts`

Follow the KYC module pattern exactly:

```typescript
import Reactory from '@reactorynet/reactory-core';
import GraphqlDefinitions from './graphql';
import Workflows from './workflows';
import Services from './services';
import Models from './models';
import Forms from './forms';
import Middlewares from './middleware';
import CliCommands from './cli';
import routes from './routes';
import { GOOGLE_MACROS, GoogleWorkspacePersona } from './ai';

const ReactoryGoogleModule: Reactory.Server.IReactoryModule = {
  id: 'reactory-google',
  nameSpace: 'google',
  version: '1.0.0',
  name: 'ReactoryGoogle',
  description: 'Google Workspace integration — Gmail, Calendar, Drive, Docs, Sheets, Contacts, Tasks',
  dependencies: ['reactory-core'],
  priority: 10,
  graphDefinitions: GraphqlDefinitions,
  workflows: Workflows,
  forms: Forms,
  services: Services,
  models: Models,
  middleware: Middlewares,
  cli: CliCommands,
  routes: routes,
  translations: [],
  clientPlugins: [],
  passportProviders: [],
  pdfs: [],
  ai: {
    macros: GOOGLE_MACROS,
    personas: [GoogleWorkspacePersona],
  },
};

export default ReactoryGoogleModule;
```

### Step 0.4: Register module in `available.json`

**File**: `src/modules/available.json`

Add an entry for `reactory-google` so the server auto-generates the `__index.ts` import on next startup. Use the same shape as existing entries.

### Step 0.5: Verify startup

Run the server (`bin/start.sh`). Confirm it starts without errors and the module appears in the loaded module list. The module does nothing yet but proves the scaffolding is sound.

---

## Phase 1 — TypeScript Types

> All types in this phase are module-internal types. They are NOT added to `reactory-core`; they live under `reactory-google/types/`.

### Step 1.1: `types/google.types.ts` — Core shared types

Define:
- `GoogleConnectionStatus` enum: `DISCONNECTED | AUTHORIZING | CONNECTED | TOKEN_EXPIRED | REVOKED | PARTIAL_ACCESS`
- `IGoogleToken` interface — fields matching the `GoogleToken` model (see Phase 2)
- `IGoogleSyncState` interface
- `IGoogleWebhookChannel` interface
- `IGoogleModuleConfig` interface — full config shape from specification Section 13.1
- `IGoogleConnection` — userId, googleEmail, status, grantedScopes, connectedAt, lastRefreshedAt
- Cache key helper type: `GoogleCacheKeyPrefix = 'google'`

### Step 1.2: `types/gmail.types.ts`

Define interfaces for:
- `IGmailMessage`, `IGmailThread`, `IGmailLabel`, `IGmailDraft`, `IGmailAttachment`, `IGmailProfile`, `IGmailBody`, `IEmailAddress`
- `IGmailMessageList` — { messages, nextPageToken, resultSizeEstimate }
- `IGmailListOptions` — { query?, labelIds?, maxResults?, pageToken? }
- `IGmailSendOptions` — { cc?, bcc?, isHtml?, attachmentFileIds?, inReplyTo?, threadId? }

### Step 1.3: `types/calendar.types.ts`

Define interfaces for:
- `IGoogleCalendar`, `ICalendarEvent`, `IEventDateTime`, `IEventAttendee`, `IEventReminders`, `IReminderOverride`
- `ICalendarEventList` — { events, nextPageToken, nextSyncToken }
- `ICalendarListOptions` — { timeMin?, timeMax?, query?, maxResults?, pageToken?, singleEvents?, orderBy? }
- `ICalendarEventInput` — input shape for creating/updating events
- `IFreeBusyResponse`
- Enums: `EventStatus`, `EventVisibility`, `AttendeeResponseStatus`

### Step 1.4: `types/drive.types.ts`

Define interfaces for:
- `IDriveFile`, `IDrivePermission`, `IDriveUser`, `IDriveFileList`, `ISharedDrive`, `IDriveRevision`
- `IDriveListOptions` — { query?, folderId?, mimeType?, maxResults?, pageToken?, orderBy? }

### Step 1.5: `types/docs.types.ts`

Define interfaces for:
- `IGoogleDoc` — { documentId, title, revisionId, body, headers, footers, footnotes }
- `IDocBatchUpdateRequest`, `IDocBatchUpdateResponse`

### Step 1.6: `types/sheets.types.ts`

Define interfaces for:
- `IGoogleSpreadsheet`, `ISheet`, `ISheetValues`, `INamedRange`, `IGridRange`
- `ISheetUpdateResponse`, `ISheetAppendResponse`, `IBatchGetResponse`, `IBatchUpdateResponse`

### Step 1.7: `types/contacts.types.ts`

Define interfaces for:
- `IGoogleContact`, `IContactName`, `IContactEmailAddress`, `IContactPhoneNumber`, `IContactAddress`, `IContactOrganization`
- `IContactGroup`, `IContactList`
- `IGoogleContactInput` — input shape for create/update

### Step 1.8: `types/tasks.types.ts`

Define interfaces for:
- `IGoogleTaskList`, `IGoogleTask`, `ITaskLink`
- Enum: `TaskStatus` (NEEDS_ACTION, COMPLETED)

### Step 1.9: `types/index.ts`

Re-export all type files:
```typescript
export * from './google.types';
export * from './gmail.types';
export * from './calendar.types';
export * from './drive.types';
export * from './docs.types';
export * from './sheets.types';
export * from './contacts.types';
export * from './tasks.types';
```

---

## Phase 2 — Data Models (Mongoose)

### Step 2.1: `models/GoogleToken.ts`

**Collection**: `google_tokens`

**Interface** `IGoogleToken`:
| Field | Type | Required | Index | Notes |
|---|---|---|---|---|
| userId | ObjectId (ref: 'User') | yes | yes (unique) | One token per user |
| accessTokenEncrypted | string | yes | | AES-256-GCM encrypted |
| refreshTokenEncrypted | string | yes | | AES-256-GCM encrypted |
| accessTokenExpiry | Date | yes | | |
| grantedScopes | string[] | yes | | |
| googleEmail | string | yes | | |
| googleUserId | string | yes | | |
| encryptionSalt | string | yes | | Per-user random salt |
| connectedAt | Date | yes | | |
| lastRefreshedAt | Date | no | | |
| revokedAt | Date | no | | |
| metadata | Mixed | no | | |

Timestamps enabled. Compound index on `{ userId: 1 }` (unique).

### Step 2.2: `models/GoogleSyncState.ts`

**Collection**: `google_sync_states`

**Interface** `IGoogleSyncState`:
| Field | Type | Required | Index |
|---|---|---|---|
| userId | ObjectId (ref: 'User') | yes | yes |
| service | string (enum: gmail, calendar, drive, contacts, tasks) | yes | yes |
| resourceId | string | no | |
| syncToken | string | no | |
| historyId | string | no | |
| lastSyncAt | Date | no | |
| status | string (enum: idle, syncing, error) | yes | |
| syncMetadata | Mixed | no | |

Compound index on `{ userId: 1, service: 1 }` (unique).

### Step 2.3: `models/GoogleWebhookChannel.ts`

**Collection**: `google_webhook_channels`

**Interface** `IGoogleWebhookChannel`:
| Field | Type | Required | Index |
|---|---|---|---|
| userId | ObjectId (ref: 'User') | yes | yes |
| channelId | string | yes | yes (unique) |
| resourceId | string | yes | |
| service | string (enum: gmail, calendar) | yes | |
| resourceType | string | no | |
| expiration | Date | yes | yes |
| token | string | yes | |
| active | boolean | yes | |

### Step 2.4: `models/GoogleAuditLog.ts`

**Collection**: `google_audit_logs`

**Interface** `IGoogleAuditLog`:
| Field | Type | Required | Index |
|---|---|---|---|
| userId | ObjectId (ref: 'User') | yes | yes |
| service | string | yes | |
| method | string | yes | |
| resourceId | string | no | |
| statusCode | number | no | |
| latencyMs | number | no | |
| errorMessage | string | no | |
| requestSummary | Mixed | no | |
| responseSummary | Mixed | no | |
| timestamp | Date | yes | yes |

Index on `{ timestamp: -1 }` and `{ userId: 1, service: 1 }`.

### Step 2.5: `models/index.ts`

Follow the KYC pattern:
- Import all four models
- Export individual models and their interfaces
- Export `ModelDefinitions` array with `Reactory.IReactoryComponentDefinition` entries:
  - `{ nameSpace: 'google', name: 'GoogleToken', version: '1.0.0', domain: Reactory.ComponentDomain.model, component: GoogleToken, ... }`
  - Same for GoogleSyncState, GoogleWebhookChannel, GoogleAuditLog
- `export default ModelDefinitions;`

### Step 2.6: Verify

Start the server. Confirm no model registration errors. Optionally seed a test document via CLI or test to confirm MongoDB collections are created.

---

## Phase 3 — Utility Functions

### Step 3.1: `utils/token-encryption.ts`

Two functions using Node.js `crypto` module:

```typescript
export function encryptToken(plaintext: string, key: string, salt: string): string
export function decryptToken(ciphertext: string, key: string, salt: string): string
```

- Algorithm: `aes-256-gcm`
- Derive encryption key from `GOOGLE_TOKEN_ENCRYPTION_KEY` env var + per-user salt using `crypto.scryptSync(key, salt, 32)`
- Store IV + authTag + ciphertext as a single base64 string (e.g. `iv:authTag:ciphertext`)
- Include unit test in `__tests__/token-encryption.test.ts`

### Step 3.2: `utils/scope-helpers.ts`

```typescript
export const GOOGLE_SCOPES: Record<string, string[]>  // Map service name → scope URLs
export function getDefaultScopes(): string[]            // profile + email
export function getScopesForServices(services: string[]): string[]
export function hasRequiredScopes(granted: string[], required: string[]): boolean
export function getMissingScopes(granted: string[], required: string[]): string[]
```

Use the scope table from specification Section 4.2.

### Step 3.3: `utils/rate-limiter.ts`

Rate limiter that uses `core.RedisService@1.0.0`:

```typescript
export class GoogleRateLimiter {
  constructor(private redisService: any) {}
  
  // Increment counter, check against limit. Key: google:ratelimit:{userId}:{service}
  async checkAndIncrement(userId: string, service: string): Promise<{ allowed: boolean; remaining: number }>
  
  // Get current count for a user+service
  async getUsage(userId: string, service: string): Promise<number>
}
```

Uses `redisService.get()`, `redisService.set()` with TTL, `redisService.expire()`. Does NOT create its own ioredis client.

### Step 3.4: `utils/error-mapper.ts`

```typescript
export function mapGoogleApiError(error: any): ApiError
```

Maps Google API error codes to appropriate Reactory ApiError instances:
- 401 → `Unauthorized` (trigger token refresh)
- 403 → `Forbidden` (scope or quota)
- 404 → `NotFound`
- 429 → `RateLimited` (trigger backoff)
- 500/503 → `ServiceUnavailable` (trigger retry)

### Step 3.5: `utils/index.ts`

Re-export all: `export * from './token-encryption'; export * from './scope-helpers'; export * from './rate-limiter'; export * from './error-mapper';`

---

## Phase 4 — Core Services (Authentication Layer)

### Step 4.1: `services/GoogleAuthService.ts`

**FQN**: `google.GoogleAuthService@1.0.0`
**Type**: `authentication` | **Lifecycle**: `singleton`
**Dependencies**: `core.UserService@1.0.0` (alias: `userService`), `core.RedisService@1.0.0` (alias: `redisService`)

This is the **most critical service** — all other Google services depend on it to get valid access tokens.

**Class structure**:
```
@service({ id: 'google.GoogleAuthService@1.0.0', ... })
class GoogleAuthService implements Reactory.Service.IReactoryService {
  name = 'GoogleAuthService'; nameSpace = 'google'; version = '1.0.0';
  context: Reactory.Server.IReactoryContext;
  
  constructor(props, context) — initialize google-auth-library OAuth2Client with env vars
  
  getAuthorizationUrl(userId, scopes): string
    — Generate state param (JSON: { userId, scopes, nonce }), store in Redis with 10min TTL
    — Return OAuth2Client.generateAuthUrl({ access_type: 'offline', scope, state, prompt: 'consent' })
  
  handleAuthCallback(code, state): IGoogleToken
    — Validate state from Redis (exists? nonce match? TTL not expired?)
    — Exchange code for tokens: OAuth2Client.getToken(code)
    — Encrypt access_token and refresh_token using token-encryption util
    — Upsert GoogleToken model (findOneAndUpdate by userId, upsert: true)
    — Delete state from Redis
    — Log auth event via audit service
    — Return token record
  
  refreshAccessToken(userId): IGoogleToken
    — Load GoogleToken from DB
    — Decrypt refresh_token
    — OAuth2Client.setCredentials({ refresh_token }); OAuth2Client.refreshAccessToken()
    — Encrypt new access_token, update DB record
    — Update Redis cache: google:token:{userId} with short TTL
    — Return updated token
  
  getToken(userId): { accessToken: string; expiresAt: Date }
    — Check Redis cache first: google:token:{userId}
    — If cache miss, load from DB, decrypt, check expiry
    — If expired, call refreshAccessToken()
    — Cache decrypted token in Redis with TTL = (expiresAt - now - 60s) buffer
    — Return plain access token (NOT encrypted)
  
  hasValidToken(userId): boolean
  getGrantedScopes(userId): string[]
  revokeAccess(userId): void
    — Call Google revoke endpoint
    — Delete GoogleToken from DB
    — Delete Redis cache entries: google:token:{userId}, google:ratelimit:{userId}:*
    — Stop active webhook channels (delegate to webhook handler)
  
  requestAdditionalScopes(userId, scopes): string
    — Same as getAuthorizationUrl but include existing scopes + new scopes
    — Set include_granted_scopes: true
  
  getAuthorizedClient(userId): OAuth2Client
    — Get token, set credentials on OAuth2Client instance, return it
    — This is the method all other services call to get an authenticated API client
}
```

**Export pattern** (at bottom of file):
```typescript
export const GoogleAuthServiceDefinition: Reactory.Service.IReactoryServiceDefinition<GoogleAuthService> = {
  service: (props, context) => new GoogleAuthService(props, context),
  id: 'google.GoogleAuthService@1.0.0',
  name: 'GoogleAuthService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google OAuth 2.0 authentication and token management',
  serviceType: 'authentication',
  dependencies: [
    { id: 'core.UserService@1.0.0', alias: 'userService' },
    { id: 'core.RedisService@1.0.0', alias: 'redisService' },
  ],
};
export { GoogleAuthService };
```

### Step 4.2: `services/GoogleAuditService.ts`

**FQN**: `google.GoogleAuditService@1.0.0`
**Type**: `logging` | **Lifecycle**: `singleton`
**Dependencies**: `core.ReactoryAuditService@1.0.0` (alias: `auditService`)

Thin wrapper around the core audit service + writes to GoogleAuditLog model:

```
Methods:
  logApiCall(service, method, userId, requestSummary, responseSummary, statusCode, latencyMs)
  logAuthEvent(userId, action, details)
  logWebhookEvent(service, payload)
  getApiUsageReport(userId, dateRange)
```

Each method creates a `GoogleAuditLog` document AND delegates to `core.ReactoryAuditService` for the central audit trail.

### Step 4.3: `services/GoogleService.ts` — Orchestrator

**FQN**: `google.GoogleService@1.0.0`
**Type**: `integration` | **Lifecycle**: `singleton`
**Dependencies**: All other Google services (listed by FQN with aliases)

Convenience orchestrator. Provides:
```
getAuthService(): GoogleAuthService
getGmailService(): GmailService
getCalendarService(): CalendarService
getDriveService(): DriveService
getDocsService(): DocsService
getSheetsService(): SheetsService
getContactsService(): ContactsService
getTasksService(): TasksService
getConnectionStatus(userId?): IGoogleConnection
disconnectAccount(userId?): void
```

Each getter delegates to `this.context.getService(fqn)`.

### Step 4.4: Update `services/index.ts`

Import and export service definitions in dependency order:
```typescript
import { GoogleAuditServiceDefinition } from './GoogleAuditService';
import { GoogleAuthServiceDefinition } from './GoogleAuthService';
import { GoogleServiceDefinition } from './GoogleService';

const services: Reactory.Service.IReactoryServiceDefinition<any>[] = [
  GoogleAuditServiceDefinition,
  GoogleAuthServiceDefinition,
  GoogleServiceDefinition,
];
export default services;
```

### Step 4.5: Verify

Start the server. Confirm all 3 services register without errors. Test OAuth URL generation via a temporary GraphQL query or CLI command.

---

## Phase 5 — REST Routes (OAuth + Webhooks)

### Step 5.1: `routes/auth.ts`

```typescript
import express from 'express';
const router = express.Router();

// GET /api/google/auth/url?scopes=gmail,calendar
router.get('/url', async (req, res) => { ... });

// GET /api/google/auth/callback?code=xxx&state=yyy
router.get('/callback', async (req, res) => { ... });

// POST /api/google/auth/disconnect
router.post('/disconnect', async (req, res) => { ... });

// GET /api/google/auth/status
router.get('/status', async (req, res) => { ... });

export default router;
```

Each handler retrieves GoogleAuthService from `req.context.getService('google.GoogleAuthService@1.0.0')`.

The callback route redirects to a client-side success/failure page (URL from env var `GOOGLE_AUTH_SUCCESS_REDIRECT`).

### Step 5.2: `routes/webhooks.ts`

```typescript
// POST /api/google/webhooks/pubsub
router.post('/pubsub', webhookVerificationMiddleware, async (req, res) => { ... });
```

Validates the incoming Pub/Sub message, identifies user + service from channel data, enqueues a sync job.

### Step 5.3: `routes/proxy.ts`

```typescript
// GET /api/google/gmail/attachment/:messageId/:attachmentId
// GET /api/google/drive/download/:fileId
// GET /api/google/drive/export/:fileId/:mimeType
// GET /api/google/drive/thumbnail/:fileId
```

Each endpoint authenticates the user, gets the appropriate Google service, streams the binary response.

### Step 5.4: `routes/index.ts`

```typescript
import express from 'express';
import authRoutes from './auth';
import webhookRoutes from './webhooks';
import proxyRoutes from './proxy';

const router = express.Router();
router.use('/google/auth', authRoutes);
router.use('/google/webhooks', webhookRoutes);
router.use('/google', proxyRoutes);

export default router;
```

### Step 5.5: `middleware/google-auth-check.ts`

Middleware that checks if the current user has a valid Google token. Sets `req.googleConnected = true/false`. Used by GraphQL resolvers and route handlers to return a helpful error when not connected.

### Step 5.6: `middleware/webhook-verification.ts`

Middleware that verifies the Google Pub/Sub push message signature using the `GOOGLE_PUBSUB_VERIFICATION_TOKEN` environment variable.

### Step 5.7: Update `middleware/index.ts`

Export the two middleware functions.

### Step 5.8: Verify

Start the server. Hit `GET /api/google/auth/url?scopes=gmail` — expect a Google OAuth URL in the response. Hit `GET /api/google/auth/status` — expect `{ status: 'DISCONNECTED' }`.

---

## Phase 6 — Google API Services

> Each service in this phase follows the same pattern:
> 1. `@service` decorator with FQN, dependencies
> 2. Constructor receives props + context
> 3. Helper `private getClient()` calls `GoogleAuthService.getAuthorizedClient(userId)` then instantiates the googleapis service client (e.g. `google.gmail({ version: 'v1', auth: client })`)
> 4. Each public method calls `getClient()`, calls the Google API, maps the response to module types, logs via audit service
> 5. Methods that read use `redisService` for caching (check cache → miss → call API → store in cache)
> 6. Methods that write invalidate relevant cache keys after success
> 7. Export a `{Name}ServiceDefinition` at the bottom

### Step 6.1: `services/GmailService.ts`

**FQN**: `google.GmailService@1.0.0`
**Type**: `messaging` | **Lifecycle**: `singleton`
**Dependencies**: `google.GoogleAuthService@1.0.0`, `core.ReactoryFileService@1.0.0`, `core.RedisService@1.0.0`

**Methods** (implement in this order):
1. `getProfile()` — `gmail.users.getProfile({ userId: 'me' })`
2. `listLabels()` — cached in `google:{userId}:gmail:labels` (5 min TTL)
3. `createLabel(name, options)`, `deleteLabel(labelId)` — invalidate label cache
4. `listMessages(query, options)` — `gmail.users.messages.list(...)` with pagination
5. `getMessage(messageId)` — `gmail.users.messages.get(...)`, parse headers for from/to/subject/date
6. `getThread(threadId)` — `gmail.users.threads.get(...)`
7. `sendMessage(to, subject, body, options)` — Build RFC 2822 message, base64url encode, `gmail.users.messages.send(...)`
8. `createDraft(to, subject, body, options)`, `updateDraft(draftId, data)`, `sendDraft(draftId)`, `deleteDraft(draftId)`
9. `replyToMessage(messageId, body, options)` — Get original message, build reply with In-Reply-To + References headers, set threadId
10. `forwardMessage(messageId, to)` — Get original, build forward
11. `trashMessage(messageId)`, `untrashMessage(messageId)`
12. `batchModifyMessages(messageIds, addLabels, removeLabels)` — `gmail.users.messages.batchModify(...)`
13. `getAttachment(messageId, attachmentId)` — `gmail.users.messages.attachments.get(...)`
14. `watchMailbox(topicName, labelIds)` — `gmail.users.watch(...)`, save channel in GoogleWebhookChannel model
15. `stopWatch()` — `gmail.users.stop(...)`, deactivate channel in DB

### Step 6.2: `services/CalendarService.ts`

**FQN**: `google.CalendarService@1.0.0`
**Type**: `data` | **Lifecycle**: `singleton`
**Dependencies**: `google.GoogleAuthService@1.0.0`, `core.RedisService@1.0.0`

**Methods**:
1. `listCalendars()` — cached in `google:{userId}:calendar:list` (10 min TTL)
2. `getCalendar(calendarId)`, `createCalendar(name, options)`, `deleteCalendar(calendarId)` — invalidate list cache
3. `listEvents(calendarId, timeMin, timeMax, options)` — `calendar.events.list(...)`
4. `getEvent(calendarId, eventId)`
5. `createEvent(calendarId, event)` — map `ICalendarEventInput` → Google API format
6. `updateEvent(calendarId, eventId, event)`
7. `deleteEvent(calendarId, eventId)`
8. `moveEvent(calendarId, eventId, destinationCalendarId)`
9. `quickAddEvent(calendarId, text)` — `calendar.events.quickAdd(...)`
10. `getFreeBusy(timeMin, timeMax, calendars)` — `calendar.freebusy.query(...)`
11. `listEventInstances(calendarId, eventId)` — For recurring events
12. `watchEvents(calendarId)` — `calendar.events.watch(...)`, save channel

### Step 6.3: `services/DriveService.ts`

**FQN**: `google.DriveService@1.0.0`
**Type**: `storage` | **Lifecycle**: `singleton`
**Dependencies**: `google.GoogleAuthService@1.0.0`, `core.ReactoryFileService@1.0.0`, `core.RedisService@1.0.0`

**Methods**:
1. `listFiles(query, options)` — `drive.files.list(...)`, cache folder contents in `google:{userId}:drive:folder:{folderId}` (5 min)
2. `getFile(fileId)` — `drive.files.get(...)`
3. `createFile(metadata, media)` — `drive.files.create(...)`, invalidate parent folder cache
4. `updateFile(fileId, metadata, media)` — `drive.files.update(...)`
5. `deleteFile(fileId)` — `drive.files.delete(...)`, invalidate parent folder cache
6. `moveFile(fileId, newParentId)` — use `addParents` / `removeParents` params on `files.update`
7. `copyFile(fileId, options)` — `drive.files.copy(...)`
8. `downloadFile(fileId)` — `drive.files.get({ alt: 'media' })`
9. `exportFile(fileId, mimeType)` — `drive.files.export(...)` for Google-native formats
10. `createFolder(name, parentId)` — `createFile` with `mimeType: 'application/vnd.google-apps.folder'`
11. `listPermissions(fileId)`, `createPermission(fileId, permission)`, `deletePermission(fileId, permissionId)`
12. `listRevisions(fileId)` — `drive.revisions.list(...)`
13. `listSharedDrives()` — `drive.drives.list(...)`
14. `searchFiles(query)` — `listFiles` with `q` parameter
15. `generateThumbnailLink(fileId)` — return `thumbnailLink` from file metadata

### Step 6.4: `services/DocsService.ts`

**FQN**: `google.DocsService@1.0.0`
**Type**: `data` | **Lifecycle**: `singleton`
**Dependencies**: `google.GoogleAuthService@1.0.0`

**Methods**: `getDocument`, `createDocument`, `batchUpdate`, `insertText`, `deleteContent`, `insertTable`, `insertImage`, `replaceText`, `updateParagraphStyle`, `getDocumentAsHTML` (export via Drive API as HTML), `getDocumentAsPlainText` (export as plain text).

### Step 6.5: `services/SheetsService.ts`

**FQN**: `google.SheetsService@1.0.0`
**Type**: `data` | **Lifecycle**: `singleton`
**Dependencies**: `google.GoogleAuthService@1.0.0`

**Methods**: `getSpreadsheet`, `createSpreadsheet`, `getValues`, `updateValues`, `appendValues`, `batchGetValues`, `batchUpdateValues`, `clearValues`, `addSheet`, `deleteSheet`, `formatCells`, `createNamedRange`, `getNamedRanges`.

### Step 6.6: `services/ContactsService.ts`

**FQN**: `google.ContactsService@1.0.0`
**Type**: `data` | **Lifecycle**: `singleton`
**Dependencies**: `google.GoogleAuthService@1.0.0`, `core.RedisService@1.0.0`

Cache: contact groups in `google:{userId}:contacts:groups` (15 min TTL).

**Methods**: `listContacts`, `getContact`, `createContact`, `updateContact`, `deleteContact`, `searchContacts`, `listContactGroups`, `createContactGroup`, `deleteContactGroup`, `addContactToGroup`, `removeContactFromGroup`, `searchDirectory`, `getOtherContacts`.

### Step 6.7: `services/TasksService.ts`

**FQN**: `google.TasksService@1.0.0`
**Type**: `data` | **Lifecycle**: `singleton`
**Dependencies**: `google.GoogleAuthService@1.0.0`, `core.RedisService@1.0.0`

Cache: task lists in `google:{userId}:tasks:lists` (10 min TTL).

**Methods**: `listTaskLists`, `getTaskList`, `createTaskList`, `updateTaskList`, `deleteTaskList`, `listTasks`, `getTask`, `createTask`, `updateTask`, `deleteTask`, `completeTask`, `moveTask`, `clearCompleted`.

### Step 6.8: Update `services/index.ts`

Add all new service definitions to the array. Order matters for dependencies — GoogleAuditService and GoogleAuthService first, then domain services, then GoogleService (orchestrator) last:

```typescript
const services = [
  GoogleAuditServiceDefinition,    // no Google deps
  GoogleAuthServiceDefinition,     // depends on core services only
  GmailServiceDefinition,          // depends on GoogleAuthService
  CalendarServiceDefinition,
  DriveServiceDefinition,
  DocsServiceDefinition,
  SheetsServiceDefinition,
  ContactsServiceDefinition,
  TasksServiceDefinition,
  GoogleServiceDefinition,         // depends on all above
];
```

### Step 6.9: Verify

Start server. Confirm all 10 services register. Connect a test Google account via the OAuth flow (Phase 5). Test one operation per service (e.g. `getProfile()`, `listCalendars()`, `listFiles()`) to confirm API connectivity.

---

## Phase 7 — GraphQL Schema & Resolvers

### Step 7.1: GraphQL type definition files

Create `.graphql` files in `graphql/types/` — one per service domain. Use the exact type definitions from specification Section 8.1.

Files:
- `Auth.graphql` — `GoogleConnection`, `GoogleConnectionStatus`
- `Gmail.graphql` — `GmailMessage`, `GmailThread`, `GmailLabel`, `GmailDraft`, `GmailAttachment`, `GmailProfile`, `GmailMessageList`, `GmailBody`, `EmailAddress`, `GmailLabelColor`
- `Calendar.graphql` — `GoogleCalendar`, `CalendarEvent`, `CalendarEventList`, `EventDateTime`, `EventAttendee`, `EventReminders`, `ReminderOverride`, `FreeBusyResponse`, enums, inputs
- `Drive.graphql` — `DriveFile`, `DriveFileList`, `DrivePermission`, `DriveUser`, `SharedDrive`
- `Docs.graphql` — `GoogleDoc`
- `Sheets.graphql` — `GoogleSpreadsheet`, `Sheet`, `SheetValues`, `NamedRange`, `GridRange`
- `Contacts.graphql` — All contact types, `ContactList`, `ContactGroup`, inputs
- `Tasks.graphql` — `GoogleTaskList`, `GoogleTask`, `TaskStatus`, `TaskLink`
- `Operations.graphql` — All Query, Mutation, and Subscription definitions (one file to avoid splitting root types)

### Step 7.2: `graphql/types/index.ts`

```typescript
import { loadGraphQLTypeDefinitions } from '@reactory/server-core/graph/graphql-loader';
import path from 'path';

const typeDefs = loadGraphQLTypeDefinitions([
  'Auth', 'Gmail', 'Calendar', 'Drive', 'Docs', 'Sheets', 'Contacts', 'Tasks', 'Operations'
], path.join(__dirname));

export default typeDefs;
```

### Step 7.3: Resolver files

One resolver class per domain. Each follows this pattern:

```typescript
import { resolver, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';
import { roles } from '@reactory/server-core/authentication/decorators';

const getService = (context) => context.getService('google.XxxService@1.0.0');

@resolver
class XxxResolver {
  resolver: any;

  @roles(['USER'], 'args.context')
  @query('queryName')
  async queryHandler(obj, params, context) {
    const svc = getService(context);
    return svc.someMethod(params);
  }

  @roles(['USER'], 'args.context')
  @mutation('mutationName')
  async mutationHandler(obj, params, context) {
    const svc = getService(context);
    return svc.someMethod(params);
  }
}
export default KYCResolver;  // Note: export the CLASS, not an instance
```

Create:
- `resolvers/AuthResolver.ts` — queries: `googleConnectionStatus`, `googleAuthUrl`; mutations: `googleDisconnect`, `googleRequestAdditionalScopes`
- `resolvers/GmailResolver.ts` — queries: `gmailProfile`, `gmailMessages`, `gmailMessage`, `gmailThread`, `gmailLabels`, `gmailDrafts`; mutations: `gmailSendMessage`, `gmailCreateDraft`, `gmailUpdateDraft`, `gmailSendDraft`, `gmailDeleteDraft`, `gmailTrashMessage`, `gmailUntrashMessage`, `gmailModifyMessage`, `gmailBatchModifyMessages`, `gmailCreateLabel`, `gmailDeleteLabel`
- `resolvers/CalendarResolver.ts` — queries: `googleCalendars`, `googleCalendar`, `calendarEvents`, `calendarEvent`, `calendarFreeBusy`; mutations: `calendarCreateEvent`, `calendarUpdateEvent`, `calendarDeleteEvent`, `calendarMoveEvent`, `calendarQuickAddEvent`, `calendarCreateCalendar`, `calendarDeleteCalendar`
- `resolvers/DriveResolver.ts` — queries: `driveFiles`, `driveFile`, `driveSharedDrives`; mutations: `driveCreateFolder`, `driveUploadFile`, `driveUpdateFile`, `driveDeleteFile`, `driveMoveFile`, `driveCopyFile`, `driveCreatePermission`, `driveDeletePermission`
- `resolvers/DocsResolver.ts` — queries: `googleDoc`; mutations: `googleDocCreate`, `googleDocInsertText`, `googleDocReplaceText`, `googleDocBatchUpdate`
- `resolvers/SheetsResolver.ts` — queries: `googleSpreadsheet`, `sheetValues`; mutations: `googleSpreadsheetCreate`, `sheetUpdateValues`, `sheetAppendValues`, `sheetClearValues`, `sheetAddSheet`, `sheetDeleteSheet`
- `resolvers/ContactsResolver.ts` — queries: `googleContacts`, `googleContact`, `googleContactGroups`; mutations: `googleContactCreate`, `googleContactUpdate`, `googleContactDelete`, `googleContactGroupCreate`, `googleContactGroupDelete`
- `resolvers/TasksResolver.ts` — queries: `googleTaskLists`, `googleTasks`, `googleTask`; mutations: `googleTaskListCreate`, `googleTaskListUpdate`, `googleTaskListDelete`, `googleTaskCreate`, `googleTaskUpdate`, `googleTaskDelete`, `googleTaskComplete`, `googleTaskClearCompleted`, `googleTaskMove`

### Step 7.4: `graphql/resolvers/index.ts`

```typescript
import { mergeGraphResolver } from '@reactory/server-core/utils';
import AuthResolver from './AuthResolver';
import GmailResolver from './GmailResolver';
import CalendarResolver from './CalendarResolver';
import DriveResolver from './DriveResolver';
import DocsResolver from './DocsResolver';
import SheetsResolver from './SheetsResolver';
import ContactsResolver from './ContactsResolver';
import TasksResolver from './TasksResolver';

export default mergeGraphResolver([
  AuthResolver, GmailResolver, CalendarResolver, DriveResolver,
  DocsResolver, SheetsResolver, ContactsResolver, TasksResolver,
]);
```

### Step 7.5: `graphql/index.ts`

```typescript
import Reactory from '@reactorynet/reactory-core';
import resolvers from './resolvers';
import types from './types';

const GoogleGraphqlDefinitions: Reactory.Graph.IGraphDefinitions = {
  Types: types,
  Resolvers: resolvers,
};

export default GoogleGraphqlDefinitions;
```

### Step 7.6: Verify

Start server. Open GraphiQL. Run `{ googleConnectionStatus { status } }` — expect `DISCONNECTED`. Connect a Google account. Run `{ gmailProfile { emailAddress messagesTotal } }` — expect user's Gmail profile data.

---

## Phase 8 — Reactory Forms

### Step 8.1: `forms/GoogleAccountConnectionForm.ts`

**Form FQN**: `google.GoogleAccountConnectionForm@1.0.0`

Schema:
- `status` (read-only display of connection state)
- `googleEmail` (read-only display of connected email)
- `grantedScopes` (read-only list of granted scope labels)
- `connectButton` (triggers OAuth flow — uses `graphql.query: googleAuthUrl`)
- `disconnectButton` (triggers `graphql.mutation: googleDisconnect`)

uiSchema:
- Use `MaterialObjectWidget` layout
- Connection status displayed prominently at top
- Scope checkboxes for gmail, calendar, drive, docs, sheets, contacts, tasks
- Connect/Disconnect as primary action buttons

### Step 8.2: `forms/GmailInboxForm.ts`

**Form FQN**: `google.GmailInboxForm@1.0.0`

Schema: message list with search, label filter, pagination. Uses `graphql.query: gmailMessages`.
uiSchema: material table/list layout with message rows showing from, subject, snippet, date, unread indicator.

### Step 8.3: `forms/GmailComposeForm.ts`

**Form FQN**: `google.GmailComposeForm@1.0.0`

Schema: `to` (array of strings), `cc`, `bcc`, `subject`, `body` (rich text), `attachments` (file array), `isHtml` (boolean).
Mutation: `gmailSendMessage`.

### Step 8.4: `forms/CalendarViewForm.ts`

**Form FQN**: `google.CalendarViewForm@1.0.0`

Schema: calendar selector (dropdown from `googleCalendars`), date range, event list. Query: `calendarEvents`.

### Step 8.5: `forms/CalendarEventForm.ts`

**Form FQN**: `google.CalendarEventForm@1.0.0`

Schema: `summary`, `description`, `location`, `start` (datetime), `end` (datetime), `attendees` (array), `recurrence`, `reminders`, `visibility`, `colorId`.
Mutations: `calendarCreateEvent`, `calendarUpdateEvent`.

### Step 8.6: `forms/DriveExplorerForm.ts`

**Form FQN**: `google.DriveExplorerForm@1.0.0`

Schema: folder hierarchy + file list with breadcrumb navigation, search, upload button. Query: `driveFiles`.

### Step 8.7: `forms/DocumentEditorForm.ts`

**Form FQN**: `google.DocumentEditorForm@1.0.0`

Schema: document selector + read-only rendered content + simple text operations. Query: `googleDoc`.

### Step 8.8: `forms/SpreadsheetViewForm.ts`

**Form FQN**: `google.SpreadsheetViewForm@1.0.0`

Schema: spreadsheet selector, sheet tabs, grid display, cell editing. Queries: `googleSpreadsheet`, `sheetValues`.

### Step 8.9: `forms/ContactsManagerForm.ts`

**Form FQN**: `google.ContactsManagerForm@1.0.0`

Schema: contact list with search, contact detail view/edit, groups sidebar. Query: `googleContacts`.

### Step 8.10: `forms/TasksManagerForm.ts`

**Form FQN**: `google.TasksManagerForm@1.0.0`

Schema: task list selector, task list with checkboxes, task detail editor. Query: `googleTaskLists`, `googleTasks`.

### Step 8.11: `forms/index.ts`

```typescript
import Reactory from '@reactorynet/reactory-core';
import GoogleAccountConnectionForm from './GoogleAccountConnectionForm';
import GmailInboxForm from './GmailInboxForm';
import GmailComposeForm from './GmailComposeForm';
import CalendarViewForm from './CalendarViewForm';
import CalendarEventForm from './CalendarEventForm';
import DriveExplorerForm from './DriveExplorerForm';
import DocumentEditorForm from './DocumentEditorForm';
import SpreadsheetViewForm from './SpreadsheetViewForm';
import ContactsManagerForm from './ContactsManagerForm';
import TasksManagerForm from './TasksManagerForm';

const forms: Reactory.Forms.IReactoryForm[] = [
  GoogleAccountConnectionForm, GmailInboxForm, GmailComposeForm,
  CalendarViewForm, CalendarEventForm, DriveExplorerForm,
  DocumentEditorForm, SpreadsheetViewForm, ContactsManagerForm, TasksManagerForm,
];

export default forms;
```

### Step 8.12: Verify

Start server. Query available forms via GraphQL. Confirm all 10 forms appear. Load `GoogleAccountConnectionForm` in the client and verify it renders the connection UI.

---

## Phase 9 — Queue Jobs

### Step 9.1: `queues/TokenRefreshQueue.ts`

Job: iterate all GoogleToken records where `accessTokenExpiry < now + 45 minutes`, call `GoogleAuthService.refreshAccessToken(userId)` for each. On failure, log error and mark sync state as `error`.

### Step 9.2: `queues/GmailSyncQueue.ts`

Job: for a given userId, get last `historyId` from GoogleSyncState, call `gmail.users.history.list(...)`, process changes, update sync state.

### Step 9.3: `queues/CalendarSyncQueue.ts`

Job: for a given userId, get last `syncToken` from GoogleSyncState, call `calendar.events.list({ syncToken })`, process changes, update sync state.

### Step 9.4: `queues/DriveSyncQueue.ts`

Job: for a given userId, get last `startPageToken` from GoogleSyncState, call `drive.changes.list(...)`, process changes, update sync state.

### Step 9.5: `queues/BatchOperationQueue.ts`

Generic batch job that accepts `{ service, method, items[] }` and processes them with rate limiting. Used for bulk Sheets writes, bulk Drive operations, etc.

### Step 9.6: `queues/index.ts`

Export all queue handlers and an `initializeGoogleQueues` factory function.

---

## Phase 10 — Workflows

### Step 10.1: `workflows/SendEmailWorkflow.ts`

A workflow step that:
1. Gets GmailService from context
2. Calls `sendMessage()` with step data
3. Logs result

Use the `workflow-es` pattern: extend `StepBody`, implement `run(context)`.

### Step 10.2: `workflows/CreateEventWorkflow.ts`

Same pattern — CalendarService.createEvent().

### Step 10.3: `workflows/GmailSyncWorkflow.ts`

Orchestrates a full Gmail sync: refresh token → get history → process changes → update state.

### Step 10.4: `workflows/CalendarSyncWorkflow.ts`

Orchestrates a full Calendar sync.

### Step 10.5: `workflows/DriveSyncWorkflow.ts`

Orchestrates a full Drive changes sync.

### Step 10.6: `workflows/index.ts`

Export array of all workflows.

---

## Phase 11 — CLI Commands

### Step 11.1: `cli/auth-status.ts`

Command: `google:auth-status`
Args: `--user <email>`
Action: Look up GoogleToken for user, print connection status, scopes, expiry.

### Step 11.2: `cli/list-connections.ts`

Command: `google:list-connections`
Action: Query all GoogleToken records, print a table of connected users with email, scopes, last refresh.

### Step 11.3: `cli/sync-gmail.ts`

Command: `google:sync-gmail`
Args: `--user <email>`
Action: Trigger an immediate Gmail sync job for the specified user.

### Step 11.4: `cli/sync-calendar.ts`

Command: `google:sync-calendar`
Args: `--user <email>`
Action: Trigger an immediate Calendar sync job.

### Step 11.5: `cli/index.ts`

```typescript
import authStatus from './auth-status';
import listConnections from './list-connections';
import syncGmail from './sync-gmail';
import syncCalendar from './sync-calendar';

export default [authStatus, listConnections, syncGmail, syncCalendar];
```

---

## Phase 12 — Static Data & i18n

### Step 12.1: `data/scopes.json`

JSON mapping of service names to their full OAuth scope URLs.

### Step 12.2: `data/api-quotas.json`

Reference document of Google API quota limits per service.

### Step 12.3: `i18n/en.json`

English translations for form labels, error messages, status descriptions, button text. Key pattern: `google.{service}.{key}`.

### Step 12.4: `i18n/af.json`

Afrikaans translations (same keys).

---

## Phase 14 — AI Capabilities (Personas & Macros)

> This phase adds AI tool-calling capabilities following the `reactory-kb` pattern. The macros use services built in Phase 6, so this phase depends on Phase 6 being complete.

### Step 14.1: `ai/macros/GetConnectionStatusMacro.ts`

**Type**: `Reactory.AI.MacroToolDefinition`

```typescript
import Reactory from '@reactorynet/reactory-core';

export const GetConnectionStatusMacro: Reactory.AI.MacroToolDefinition = {
  name: 'google_connection_status',
  description: 'Check the current user\'s Google account connection status',
  type: 'function',
  function: {
    name: 'google_connection_status',
    description: 'Check whether the current user has a connected Google account and what scopes are authorized',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  roles: ['USER', 'ADMIN'],
  runat: 'server',
  handler: async (params: any, context: Reactory.Server.IReactoryContext) => {
    const authService = context.getService<any>('google.GoogleAuthService@1.0.0');
    if (!authService) {
      throw new Error('GoogleAuthService not available');
    }
    const status = await authService.getConnectionStatus(context.user.id);
    return {
      success: true,
      data: status,
      message: `Google account ${status.connected ? 'connected' : 'not connected'}`,
      instructions: status.connected
        ? `## Google Connected\n\nEmail: **${status.googleEmail}**\nScopes: ${status.grantedScopes?.join(', ')}\n\n### Available Actions:\n- Use any Google tool (email, calendar, drive, etc.)`
        : `## Google Not Connected\n\nThe user needs to connect their Google account via the OAuth flow.\n\n### Next Step:\n- Direct the user to the Google Account Connection form`,
    };
  },
};

export default GetConnectionStatusMacro;
```

### Step 14.2: `ai/macros/SendEmailMacro.ts`

**Tool name**: `google_send_email`
**Parameters**: `to` (required), `subject` (required), `body` (required), `cc`, `bcc`, `isHtml`
**Handler**: Gets `google.GmailService@1.0.0` via `context.getService()`, calls `sendMessage({ to, subject, body, cc, bcc, isHtml })`.
**Instructions on success**: Show message ID, confirm recipient, suggest `google_search_email` to verify delivery.
**Instructions on failure**: Show error, suggest checking connection with `google_connection_status`.

### Step 14.3: `ai/macros/SearchEmailMacro.ts`

**Tool name**: `google_search_email`
**Parameters**: `query` (required), `maxResults` (default: 10), `labelIds`
**Handler**: Gets `google.GmailService@1.0.0`, calls `listMessages({ query, maxResults, labelIds })`.
**Instructions**: Show message count, list top results with subject/from/date, suggest reading specific messages.

### Step 14.4: `ai/macros/CreateEventMacro.ts`

**Tool name**: `google_create_event`
**Parameters**: `summary` (required), `start` (required, ISO 8601), `end` (required, ISO 8601), `description`, `location`, `attendees` (comma-separated emails)
**Handler**: Gets `google.CalendarService@1.0.0`, calls `createEvent(...)`.
**Instructions**: Show event ID, link, attendee count, suggest `google_list_events` to verify.

### Step 14.5: `ai/macros/ListEventsMacro.ts`

**Tool name**: `google_list_events`
**Parameters**: `timeMin` (default: now), `timeMax` (default: 7 days from now), `maxResults` (default: 10), `query`
**Handler**: Gets `google.CalendarService@1.0.0`, calls `listEvents(...)`.
**Instructions**: List events with time, summary, attendees. Suggest `google_create_event` if user wants to schedule.

### Step 14.6: `ai/macros/SearchDriveMacro.ts`

**Tool name**: `google_search_drive`
**Parameters**: `query` (required), `mimeType`, `maxResults` (default: 10)
**Handler**: Gets `google.DriveService@1.0.0`, calls `listFiles({ query, mimeType, maxResults })`.
**Instructions**: List files with name, type, modified date, owner. Suggest `google_read_sheet` for spreadsheets, `google_create_doc` if nothing found.

### Step 14.7: `ai/macros/ReadSheetMacro.ts`

**Tool name**: `google_read_sheet`
**Parameters**: `spreadsheetId` (required), `range` (required, e.g. `Sheet1!A1:D10`), `majorDimension` (default: ROWS)
**Handler**: Gets `google.SheetsService@1.0.0`, calls `getValues(spreadsheetId, range)`.
**Instructions**: Show data shape (rows × cols), preview first rows, suggest different range if data is large.

### Step 14.8: `ai/macros/CreateDocMacro.ts`

**Tool name**: `google_create_doc`
**Parameters**: `title` (required), `content` (initial body text, optional)
**Handler**: Gets `google.DocsService@1.0.0`, calls `createDocument(title)`. If `content` provided, calls `batchUpdate` to insert text.
**Instructions**: Show document ID, title, link to open in Google Docs.

### Step 14.9: `ai/macros/ListContactsMacro.ts`

**Tool name**: `google_list_contacts`
**Parameters**: `query` (optional search string), `maxResults` (default: 20)
**Handler**: Gets `google.ContactsService@1.0.0`, calls `listContacts({ query, maxResults })`.
**Instructions**: List contacts with name, email, phone. Suggest refining search if too many results.

### Step 14.10: `ai/macros/CreateTaskMacro.ts`

**Tool name**: `google_create_task`
**Parameters**: `title` (required), `notes`, `due` (ISO 8601 date), `taskListId` (default: `@default`)
**Handler**: Gets `google.TasksService@1.0.0`, calls `createTask(taskListId, { title, notes, due })`.
**Instructions**: Show task ID, title, due date. Suggest creating more tasks or listing existing ones.

### Step 14.11: `ai/macros/index.ts`

Export all 10 macros as `GOOGLE_MACROS` array and named exports. Follow the exact pattern from specification Section 18.3.3.

### Step 14.12: `ai/persona/GoogleWorkspaceAssistant/GoogleWorkspacePersona.ts`

**Type**: `IAIPersona` (imported from `modules/reactory-reactor/types/service.types`)

Implementation:
1. Import `GOOGLE_MACROS` from `../../macros`
2. Define `buildSystemPrompt()` function — describes the assistant's identity, lists all 10 tools with descriptions, provides workflow guidelines per specification Section 18.4.2
3. Export `GoogleWorkspacePersona` with:
   - `id: 'GoogleWorkspaceAssistant'`
   - `name: 'Google Workspace Assistant'`
   - `nameSpace: 'google'`
   - `version: '1.0.0'`
   - `modelId: process.env.GOOGLE_AI_STUDIO_MODEL_ID || 'gemini-2.5-pro'`
   - `providerId: 'google'`
   - `persona: 'google_workspace_assistant'`
   - `tools: [...GOOGLE_MACROS]`
   - `macros: [...GOOGLE_MACROS]`
   - `prompts: { system: { content: buildSystemPrompt(), role: 'system' } }`
   - `config: { apiKey, apiBaseURL, project }` from env vars
   - `defaultGreeting` per specification Section 18.4.3

### Step 14.13: `ai/persona/GoogleWorkspaceAssistant/agent.yaml`

Create the YAML persona file per specification Section 18.4.3. Include `id`, `name`, `description`, `modelId`, `providerId`, `config`, `persona` (multiline), `features` (multiline), `defaultGreeting`, and `tools.includes` array.

### Step 14.14: `ai/index.ts`

```typescript
import { GOOGLE_MACROS } from './macros';
import { GoogleWorkspacePersona } from './persona/GoogleWorkspaceAssistant/GoogleWorkspacePersona';

export { GOOGLE_MACROS, GoogleWorkspacePersona };

export default {
  macros: GOOGLE_MACROS,
  persona: GoogleWorkspacePersona,
};
```

### Step 14.15: Verify

- Confirm the module `index.ts` imports from `./ai` and includes the `ai` property
- Start the server — module should load without errors
- Verify the persona and macros are registered by checking the AI service registry

---

## Phase 15 — Testing

> Renumbered from Phase 13 — includes AI tests.

### Step 15.1: `__tests__/utils/token-encryption.test.ts`

Test encrypt/decrypt roundtrip, invalid key handling, tampered ciphertext detection.

### Step 15.2: `__tests__/utils/scope-helpers.test.ts`

Test scope resolution, missing scope detection, default scopes.

### Step 15.3: `__tests__/utils/rate-limiter.test.ts`

Test rate limit check with mocked RedisService, counter increment, TTL behavior.

### Step 15.4: `__tests__/services/GoogleAuthService.test.ts`

Mock `google-auth-library` OAuth2Client. Test:
- URL generation with correct scopes and state
- Callback handling with code exchange
- Token encryption on save
- Token refresh flow
- Revocation and cleanup

### Step 15.5: `__tests__/services/GmailService.test.ts`

Mock `googleapis` Gmail client. Test:
- `listMessages` with pagination
- `getMessage` header parsing
- `sendMessage` RFC 2822 encoding
- Label cache behavior (hit/miss/invalidation)

### Step 15.6: `__tests__/services/CalendarService.test.ts`

Mock Calendar API. Test event CRUD, recurring events, free/busy.

### Step 15.7: `__tests__/services/DriveService.test.ts`

Mock Drive API. Test file list, upload, download, permissions, folder creation.

### Step 15.8: `__tests__/services/SheetsService.test.ts`

Mock Sheets API. Test cell read/write, batch operations.

### Step 15.9: `__tests__/graphql/resolvers.test.ts`

Test resolver methods with mocked services and context. Verify role checks, error propagation.

### Step 15.10: `__tests__/models/GoogleToken.test.ts`

Test model validation, unique constraints, methods.

### Step 15.11: `__tests__/ai/macros.test.ts`

Test each macro handler with mocked services and context:
- `GetConnectionStatusMacro`: Mock `GoogleAuthService.getConnectionStatus()` → verify connected/disconnected responses
- `SendEmailMacro`: Mock `GmailService.sendMessage()` → verify success result shape and instructions
- `SearchEmailMacro`: Mock `GmailService.listMessages()` → verify result with pagination
- `CreateEventMacro`: Mock `CalendarService.createEvent()` → verify event data in result
- `ListEventsMacro`: Mock `CalendarService.listEvents()` → verify event list formatting
- `SearchDriveMacro`: Mock `DriveService.listFiles()` → verify file list result
- `ReadSheetMacro`: Mock `SheetsService.getValues()` → verify data shape
- `CreateDocMacro`: Mock `DocsService.createDocument()` → verify doc ID in result
- `ListContactsMacro`: Mock `ContactsService.listContacts()` → verify contact list
- `CreateTaskMacro`: Mock `TasksService.createTask()` → verify task creation

For each: verify `success: true`, `data` shape, `message`, `instructions` contains suggested next steps.

### Step 15.12: `__tests__/ai/persona.test.ts`

Test persona definition:
- Verify `GoogleWorkspacePersona.id === 'GoogleWorkspaceAssistant'`
- Verify `tools` array contains all 10 macros
- Verify `macros` array contains all 10 macros
- Verify `prompts.system.content` is non-empty and contains key tool names
- Verify `config` reads from expected env vars

### Step 15.13: Run full test suite

```bash
cd $REACTORY_SERVER && bin/jest.sh --testPathPattern=reactory-google
```

All tests must pass.

---

## Phase Summary

| Phase | Steps | Deliverables | Dependencies |
|---|---|---|---|
| 0 — Scaffolding | 0.1–0.5 | package.json, directory tree, module index, registration | None |
| 1 — Types | 1.1–1.9 | All TypeScript interfaces and enums | Phase 0 |
| 2 — Models | 2.1–2.6 | 4 Mongoose models, model index | Phase 1 |
| 3 — Utils | 3.1–3.5 | Encryption, scopes, rate limiter, error mapper | Phase 1 |
| 4 — Core Services | 4.1–4.5 | GoogleAuthService, GoogleAuditService, GoogleService | Phases 2, 3 |
| 5 — Routes | 5.1–5.8 | OAuth, webhook, proxy routes + middleware | Phase 4 |
| 6 — API Services | 6.1–6.9 | Gmail, Calendar, Drive, Docs, Sheets, Contacts, Tasks | Phase 4 |
| 7 — GraphQL | 7.1–7.6 | Type defs, resolvers, schema | Phase 6 |
| 8 — Forms | 8.1–8.12 | 10 Reactory form definitions | Phase 7 |
| 9 — Queues | 9.1–9.6 | 5 queue job types | Phase 6 |
| 10 — Workflows | 10.1–10.6 | 5 workflow definitions | Phase 6 |
| 11 — CLI | 11.1–11.5 | 4 CLI commands | Phase 4 |
| 12 — Static Data | 12.1–12.4 | Scopes JSON, quotas JSON, i18n | Phase 3 |
| 13 — AI Capabilities | 14.1–14.15 | 10 macros, 1 persona, agent.yaml, ai index | Phase 6 |
| 14 — Testing | 15.1–15.13 | Unit + integration tests (including AI tests) | All phases |

### Execution Order (parallelizable phases marked)

```
Phase 0 (Scaffolding)
  └─→ Phase 1 (Types)
       ├─→ Phase 2 (Models)       ← can run in parallel with Phase 3
       ├─→ Phase 3 (Utils)        ← can run in parallel with Phase 2
       │    └─→ Phase 12 (Static Data) ← can run anytime after Phase 3
       └─→ Phase 4 (Core Services) ← needs Phases 2 + 3
            ├─→ Phase 5 (Routes)   ← can run in parallel with Phase 6
            ├─→ Phase 6 (API Services) ← can run in parallel with Phase 5
            │    ├─→ Phase 7 (GraphQL) ← needs Phase 6
            │    │    └─→ Phase 8 (Forms) ← needs Phase 7
            │    ├─→ Phase 9 (Queues)  ← can run in parallel with Phase 7
            │    ├─→ Phase 10 (Workflows) ← can run in parallel with Phase 7
            │    └─→ Phase 14 (AI Capabilities) ← can run in parallel with Phase 7
            └─→ Phase 11 (CLI)     ← needs Phase 4 only
                 └─→ Phase 15 (Testing) ← after all phases
```
