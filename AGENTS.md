# reactory-google — Server Module Agent Context

## What Is This Module

A comprehensive Google Workspace integration module for the Reactory platform. Provides unified access to Gmail, Google Calendar, Google Drive (Docs, Sheets, Slides), Google Contacts (People API), and Google Tasks — with OAuth 2.0 token management, multi-tenant support, push notifications, and schema-driven UI forms.

- **Module ID**: `reactory-google`
- **Namespace**: `google`
- **FQN**: `google.ReactoryGoogle@1.0.0`
- **Version**: `1.0.0`
- **Priority**: `10`
- **License**: MIT
- **Dependencies**: `googleapis`, `google-auth-library`, peer `@reactorynet/reactory-core`, `@reactory/server-core`

## Role in the Reactory Ecosystem

This module is a **server-side integration layer** within `reactory-express-server`. It is one of many modules under `src/modules/` and follows the standard `Reactory.Server.IReactoryModule` contract. It:
- Registers 10 services consumed by GraphQL resolvers, forms, workflows, and queues
- Exposes Google Workspace operations via GraphQL and REST APIs
- Provides Reactory Form definitions for client-side UIs (PWA and Native)
- Integrates with shared platform services (`core.RedisService@1.0.0`, `core.ReactoryFileService@1.0.0`, `core.ReactoryAuditService@1.0.0`, `core.UserService@1.0.0`, `reactory.QueueProvider@1.0.0`)
- Follows the same patterns as `reactory-kyc`, `reactory-slack`, `reactory-azure`, and `reactory-socialeyes` modules

## Directory Structure

```
reactory-google/
  index.ts                  # Module definition (IReactoryModule) — entry point
  package.json              # Module dependencies (googleapis, google-auth-library)
  AGENTS.md                 # This file — agent context (primary)
  CLAUDE.md                 # Symlink → AGENTS.md
  .github/
    copilot-instructions.md # Symlink → ../../AGENTS.md
  docs/
    specification.md        # Full functional specification (21 sections)
    implementation-plan.md  # 13-phase, 76-step implementation plan
  types/
    index.ts                # Re-exports all type files
    google.types.ts         # Core types (connection status, config, token interfaces)
    gmail.types.ts          # Gmail message, thread, label, draft, attachment types
    calendar.types.ts       # Calendar event, attendee, reminder types
    drive.types.ts          # Drive file, permission, revision types
    docs.types.ts           # Google Docs document, batch update types
    sheets.types.ts         # Sheets spreadsheet, grid, named range types
    contacts.types.ts       # People API contact, group types
    tasks.types.ts          # Task list, task types
  services/
    index.ts                # Service definitions array
    GoogleService.ts        # Orchestrator — facade for all Google operations
    GoogleAuthService.ts    # OAuth 2.0 authorization code flow, token refresh, revocation
    GmailService.ts         # Gmail API v1 — messages, threads, labels, drafts, attachments
    CalendarService.ts      # Calendar API v3 — events, calendars, free/busy, ACL
    DriveService.ts         # Drive API v3 — files, folders, permissions, shared drives
    DocsService.ts          # Docs API v1 — document read/write, batch updates
    SheetsService.ts        # Sheets API v4 — cell read/write, batch updates, named ranges
    ContactsService.ts      # People API v1 — contacts, contact groups, directory
    TasksService.ts         # Tasks API v1 — task lists, tasks
    GoogleAuditService.ts   # Google-specific audit wrapper
  models/
    index.ts
    GoogleToken.ts          # OAuth token storage (AES-256-GCM encrypted)
    GoogleSyncState.ts      # Sync state tracking (per-user, per-service)
    GoogleWebhookChannel.ts # Push notification channel management
    GoogleAuditLog.ts       # Google API audit log
  graphql/
    index.ts
    types/
      index.ts
      auth.graphql          # Auth/token types and connection status
      gmail.graphql         # Gmail message, thread, label types
      calendar.graphql      # Calendar event, calendar types
      drive.graphql         # Drive file, folder, permission types
      docs.graphql          # Docs document types
      sheets.graphql        # Sheets spreadsheet types
      contacts.graphql      # Contact, contact group types
      tasks.graphql         # Task list, task types
    resolvers/
      index.ts
      AuthResolver.ts       # OAuth mutations, connection status queries
      GmailResolver.ts      # Gmail queries and mutations
      CalendarResolver.ts   # Calendar queries and mutations
      DriveResolver.ts      # Drive queries and mutations
      DocsResolver.ts       # Docs queries and mutations
      SheetsResolver.ts     # Sheets queries and mutations
      ContactsResolver.ts   # Contacts queries and mutations
      TasksResolver.ts      # Tasks queries and mutations
  forms/
    index.ts
    GoogleAccountConnectionForm.ts  # OAuth connection/disconnection UI
    GmailComposeForm.ts             # Email compose form
    GmailInboxForm.ts               # Inbox browser form
    CalendarEventForm.ts            # Calendar event CRUD form
    CalendarViewForm.ts             # Calendar view/browse form
    DriveExplorerForm.ts            # Drive file browser form
    DocumentEditorForm.ts           # Google Docs editor form
    SpreadsheetViewForm.ts          # Sheets viewer/editor form
    ContactsManagerForm.ts          # Contact management form
    TasksManagerForm.ts             # Task management form
  routes/
    index.ts
    auth.ts                 # OAuth callback and token endpoints
    webhooks.ts             # Google Pub/Sub webhook receiver
    proxy.ts                # Attachment/file proxy routes
  workflows/
    index.ts
    GmailSyncWorkflow.ts    # Gmail sync workflow (workflow-es StepBody)
    CalendarSyncWorkflow.ts # Calendar sync workflow
    DriveSyncWorkflow.ts    # Drive sync workflow
    SendEmailWorkflow.ts    # Email sending workflow step
    CreateEventWorkflow.ts  # Calendar event creation workflow step
  queues/
    index.ts
    GmailSyncQueue.ts       # Gmail sync jobs (BullMQ via QueueProvider)
    CalendarSyncQueue.ts    # Calendar sync jobs
    DriveSyncQueue.ts       # Drive sync jobs
    BatchOperationQueue.ts  # Large-scale batch operations
    WebhookProcessingQueue.ts # Push notification processing
  middleware/
    index.ts
  cli/
    index.ts                # CLI commands (google:connect, google:sync, google:status, google:revoke)
  ai/
    index.ts                # Exports GOOGLE_MACROS and GoogleWorkspacePersona
    macros/
      index.ts              # 10 macro definitions array
      SendEmailMacro.ts     # AI tool: send email via Gmail
      SearchEmailMacro.ts   # AI tool: search Gmail messages
      CreateEventMacro.ts   # AI tool: create Calendar event
      ListEventsMacro.ts    # AI tool: list upcoming Calendar events
      SearchDriveMacro.ts   # AI tool: search Drive files
      ReadSheetMacro.ts     # AI tool: read Sheets data
      CreateDocMacro.ts     # AI tool: create Google Doc
      ListContactsMacro.ts  # AI tool: list/search Contacts
      CreateTaskMacro.ts    # AI tool: create a Task
      GetConnectionStatusMacro.ts  # AI tool: check Google connection
    persona/
      GoogleWorkspaceAssistant/
        agent.yaml          # IAIPersona YAML configuration
        GoogleWorkspacePersona.ts  # TypeScript persona definition
  utils/
    index.ts
    encryption.ts           # AES-256-GCM encrypt/decrypt for tokens
    scopes.ts               # Google OAuth scope constants and helpers
    rateLimiter.ts          # Per-user Google API rate limiting
    cacheKeys.ts            # Cache key builders (google:{userId}:{service}:{key})
  data/                     # Static JSON files
  i18n/
    en.json                 # English translations
```

## Services Registered

| Service FQN | Class | Purpose |
|---|---|---|
| `google.GoogleService@1.0.0` | GoogleService | Orchestrator / facade for all Google operations |
| `google.GoogleAuthService@1.0.0` | GoogleAuthService | OAuth 2.0 token management (authorize, refresh, revoke) |
| `google.GmailService@1.0.0` | GmailService | Gmail messages, threads, labels, drafts, attachments |
| `google.CalendarService@1.0.0` | CalendarService | Calendar events, calendars, free/busy, ACL |
| `google.DriveService@1.0.0` | DriveService | Drive files, folders, permissions, shared drives |
| `google.DocsService@1.0.0` | DocsService | Google Docs read/write, batch updates |
| `google.SheetsService@1.0.0` | SheetsService | Sheets cell read/write, batch operations |
| `google.ContactsService@1.0.0` | ContactsService | People API contacts and contact groups |
| `google.TasksService@1.0.0` | TasksService | Task lists and tasks |
| `google.GoogleAuditService@1.0.0` | GoogleAuditService | Google-specific audit logging |

All services use `serviceType: 'data'` and the `@service` decorator with dependency injection via `context.getService(fqn)`.

## Data Models (Mongoose)

| Model | Collection | Purpose |
|---|---|---|
| GoogleToken | `google_tokens` | Encrypted OAuth access/refresh tokens per user |
| GoogleSyncState | `google_sync_states` | Sync cursors and state per user per service |
| GoogleWebhookChannel | `google_webhook_channels` | Active push notification channel tracking |
| GoogleAuditLog | `google_audit_logs` | All Google API interaction audit records |

## Google API Coverage

| Google Service | API | Key Capabilities |
|---|---|---|
| Gmail | Gmail API v1 | Messages, Threads, Labels, Drafts, Attachments, Push Notifications |
| Calendar | Calendar API v3 | Events, Calendars, Free/Busy, ACL, Settings |
| Drive | Drive API v3 | Files, Folders, Permissions, Shared Drives, Revisions |
| Docs | Docs API v1 | Document read/write, Batch updates, Structural edits |
| Sheets | Sheets API v4 | Cell read/write, Batch updates, Named ranges, Charts |
| Contacts | People API v1 | Contacts, Contact Groups, Directory, Other Contacts |
| Tasks | Tasks API v1 | Task Lists, Tasks, Status, Due Dates |

## Shared Platform Dependencies

This module does **not** create its own Redis clients, file storage, or audit infrastructure. It consumes existing shared services:

| FQN | Purpose |
|---|---|
| `core.RedisService@1.0.0` | All caching and ephemeral state (token caches, profile caches, list caches) |
| `core.ReactoryFileService@1.0.0` | Attachment and file storage (Gmail attachments, Drive downloads) |
| `core.ReactoryAuditService@1.0.0` | Audit trail recording |
| `core.UserService@1.0.0` | User lookup and identity |
| `reactory.QueueProvider@1.0.0` | BullMQ job queue management |

## Caching Strategy

All caching uses `core.RedisService@1.0.0` with namespaced keys:
- Token data: `google:{userId}:auth:token` (TTL: token expiry minus 5 min)
- Gmail profile: `google:{userId}:gmail:profile` (TTL: 5 min)
- Gmail labels: `google:{userId}:gmail:labels` (TTL: 10 min)
- Calendar list: `google:{userId}:calendar:list` (TTL: 5 min)
- Drive file metadata: `google:{userId}:drive:file:{fileId}` (TTL: 5 min)
- Connection status: `google:{userId}:connection:status` (TTL: 1 min)

## Environment Variables

```bash
# Required
GOOGLE_CLIENT_ID             # OAuth 2.0 client ID
GOOGLE_CLIENT_SECRET         # OAuth 2.0 client secret
GOOGLE_REDIRECT_URI          # OAuth callback URL

# Optional
GOOGLE_SERVICE_ACCOUNT_KEY   # Service account JSON key (for domain-wide delegation)
GOOGLE_PUBSUB_TOPIC          # Pub/Sub topic for push notifications
GOOGLE_PUBSUB_SUBSCRIPTION   # Pub/Sub subscription name
GOOGLE_WEBHOOK_DOMAIN        # Public domain for webhook endpoints
GOOGLE_TOKEN_ENCRYPTION_KEY  # AES-256 key for token encryption (defaults to server secret)
GOOGLE_API_RATE_LIMIT        # Per-user rate limit (requests/sec, default: 10)
```

## Key Patterns

- **OAuth 2.0**: Authorization code flow → encrypted token storage → automatic refresh → multi-scope consent
- **Service decorator**: `@service({ id: 'google.ServiceName@1.0.0', ... })` with `deps` array
- **GraphQL**: `.graphql` type files loaded via `loadGraphQLTypeDefinitions()`, resolvers via `@resolver`/`@query`/`@mutation` decorators
- **Forms**: `Reactory.Forms.IReactoryForm` with JSON Schema + Material UI uiSchema
- **Queues**: BullMQ jobs via `reactory.QueueProvider@1.0.0` with `addJob`/`addProcessor`
- **Workflows**: `workflow-es` library with `StepBody`/`StepExecutionContext`
- **Models**: Mongoose interface → Schema → Model pattern with `google_` collection prefix
- **CLI**: Commands under `google:` namespace (connect, sync, status, revoke)

## AI Capabilities

The module exports AI macros and a persona via the `ai` property on the module definition, following the `reactory-kb` pattern.

### Persona

| Property | Value |
|---|---|
| ID | `GoogleWorkspaceAssistant` |
| Name | `Google Workspace Assistant` |
| Namespace | `google` |
| Model | `${GOOGLE_AI_STUDIO_MODEL_ID:-gemini-2.5-pro}` |
| Provider | `google` |

Specialized in managing Google Workspace operations through conversational AI. Includes a YAML definition at `ai/persona/GoogleWorkspaceAssistant/agent.yaml`.

### Macros (AI Tools)

| Tool Name | Description |
|---|---|
| `google_connection_status` | Check Google account connection status |
| `google_send_email` | Compose and send email via Gmail |
| `google_search_email` | Search Gmail messages by query |
| `google_create_event` | Create a Google Calendar event |
| `google_list_events` | List upcoming calendar events |
| `google_search_drive` | Search files in Google Drive |
| `google_read_sheet` | Read data from a Google Sheet |
| `google_create_doc` | Create a new Google Document |
| `google_list_contacts` | List or search Google Contacts |
| `google_create_task` | Create a task in Google Tasks |

All macros are `Reactory.AI.MacroToolDefinition` typed, run on the server, and use `context.getService(fqn)` to access Google services.

## Documentation

- **Full specification**: `docs/specification.md` — 21 sections covering all APIs, data models, GraphQL schema, REST endpoints, caching, queues, workflows, forms, testing, security, configuration, deployment, and roadmap
- **Implementation plan**: `docs/implementation-plan.md` — 13 phases, 76 steps with exact file paths, code patterns, and verification criteria

## Conventions / Notes

- Follows the same module structure as `reactory-kyc`, `reactory-slack`, `reactory-azure`, `reactory-socialeyes`
- Module registration via `available.json` — never edit `src/modules/__index.ts` directly
- All Google API calls go through authenticated `googleapis` client obtained from `GoogleAuthService`
- Tokens are AES-256-GCM encrypted at rest; never stored in plaintext
- Push notifications use Google Pub/Sub → webhook endpoint → queue processing
- Batch operations and sync use the Reactory queue system (BullMQ)
- All public operations produce audit log entries
- Multi-tenant: organization-specific Google Workspace configurations supported
- Import aliases: `@reactorynet/reactory-core`, `@reactory/server-core/*`

---
This file is factual context for universal agents. Do not add system prompts or persona instructions.
