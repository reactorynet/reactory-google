/**
 * Google Workspace AI Macros
 *
 * Callable Reactor macros for Google Workspace operations.
 *
 * Each entry conforms to the standard reactor macro/tool contract —
 * a `MacroComponentDefinition` carrying a `component` function plus one or more
 * `tools` — so `ReactorMacroService.collectMacros` registers it and personas can
 * expose the tools to the model. The component resolves Google services from
 * `state.context.getService(...)`.
 *
 * NOTE: the previous implementation used the legacy `Reactory.AI.IMacro` shape
 * (`handler` + `parameters[]`), which lacks the `component` field the registry
 * requires — so every macro was rejected as an "Invalid macro definition".
 */

import {
  ChatState,
  MacroComponentDefinition,
  MacroToolDefinition,
} from '@reactory/server-modules/reactory-reactor/ai/openai/types/chat';

const GOOGLE_NS = 'google';
const GOOGLE_VERSION = '1.0.0';
const ROLE_SET = ['USER', 'ADMIN'];

/** Structured success envelope returned by every Google macro. */
const ok = (tool: string, params: any, data: any, message?: string) => ({
  success: true,
  data,
  tool,
  params,
  ...(message ? { message } : {}),
});

/** Structured failure envelope returned by every Google macro. */
const fail = (tool: string, params: any, error: string, instructions?: string) => ({
  success: false,
  error,
  tool,
  params,
  ...(instructions ? { instructions } : {}),
});

// ─────────────────────────────────────────────────────────────────────────────
// GetConnectionStatus
// ─────────────────────────────────────────────────────────────────────────────
const GetConnectionStatus = async (params: any, state: ChatState) => {
  const { context } = state;
  const authService = context?.getService('google.GoogleAuthService@1.0.0') as any;
  if (!authService) return fail('GetConnectionStatus', params, 'Google Auth Service not available');
  try {
    const data = await authService.getConnectionStatus(String(context.user?._id));
    return ok('GetConnectionStatus', params, data);
  } catch (error) {
    return fail('GetConnectionStatus', params, error instanceof Error ? error.message : 'Unknown error');
  }
};

const GetConnectionStatusMacro: MacroComponentDefinition<typeof GetConnectionStatus> = {
  nameSpace: GOOGLE_NS,
  name: 'GetConnectionStatus',
  version: GOOGLE_VERSION,
  component: GetConnectionStatus,
  description: "Check the current user's Google Workspace connection status",
  alias: 'GetConnectionStatus',
  runat: 'server',
  icon: 'link',
  roles: ROLE_SET,
  tags: ['google', 'auth', 'status'],
  tools: [
    {
      type: 'function',
      roles: ROLE_SET,
      safeForAutoExecution: true,
      function: {
        name: 'GetConnectionStatus',
        icon: 'link',
        description:
          "Check whether the current user's Google Workspace account is connected and which scopes are granted.",
        parameters: { type: 'object', properties: {}, required: [] },
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// GetAuthUrl
//
// Generates the Google OAuth consent URL for the current user. This is the
// tool-call half of the "connect your Google account" flow: the agent can hand
// the user a link without any UI being mounted. The same URL is exposed to
// forms via the `google.GoogleAuthUrlWidget@1.0.0` client widget, which calls
// the equivalent `googleAuthUrl` GraphQL query.
//
// `services` takes LOGICAL service names (gmail, calendar, drive, docs, sheets,
// contacts, tasks) — GoogleAuthService maps them to scope URLs internally.
// Omitting it requests the module's default scope set.
// ─────────────────────────────────────────────────────────────────────────────
const GetAuthUrl = async (params: any, state: ChatState) => {
  const { context } = state;
  const authService = context?.getService('google.GoogleAuthService@1.0.0') as any;
  if (!authService) return fail('GetAuthUrl', params, 'Google Auth Service not available');

  const userId = String(context.user?._id);
  if (!userId || userId === 'undefined') {
    return fail(
      'GetAuthUrl',
      params,
      'No authenticated user in context',
      'GetAuthUrl requires a signed-in user — the consent URL is bound to a user id via the OAuth state parameter.',
    );
  }

  try {
    const services = Array.isArray(params.services) ? params.services : [];
    const url = await authService.getAuthorizationUrl(userId, services);
    return ok('GetAuthUrl', params, { url, services }, 'Open this URL in a browser to grant Google Workspace access.');
  } catch (error) {
    return fail('GetAuthUrl', params, error instanceof Error ? error.message : 'Unknown error');
  }
};

const GetAuthUrlMacro: MacroComponentDefinition<typeof GetAuthUrl> = {
  nameSpace: GOOGLE_NS,
  name: 'GetAuthUrl',
  version: GOOGLE_VERSION,
  component: GetAuthUrl,
  description: 'Generate the Google OAuth consent URL for the current user',
  alias: 'GetAuthUrl',
  runat: 'server',
  icon: 'link',
  roles: ROLE_SET,
  tags: ['google', 'auth', 'oauth', 'url', 'connect'],
  tools: [
    {
      type: 'function',
      roles: ROLE_SET,
      safeForAutoExecution: true,
      function: {
        name: 'GetAuthUrl',
        icon: 'link',
        description:
          'Generate a Google OAuth consent URL the user can open to grant Workspace access (Gmail, Calendar, Drive, Docs, Sheets, Contacts, Tasks). Returns { url }. Use when Google calls fail with an expired or revoked token.',
        parameters: {
          type: 'object',
          properties: {
            services: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Logical services to request: gmail, calendar, drive, docs, sheets, contacts, tasks. Omit for the default scope set.',
            },
          },
          required: [],
        },
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SendEmail
// ─────────────────────────────────────────────────────────────────────────────
const SendEmail = async (params: any, state: ChatState) => {
  const { context } = state;
  const gmailService = context?.getService('google.GmailService@1.0.0') as any;
  if (!gmailService) return fail('SendEmail', params, 'Gmail Service not available');
  try {
    const data = await gmailService.sendMessage(String(context.user?._id), params);
    return ok('SendEmail', params, data, 'Email sent');
  } catch (error) {
    return fail('SendEmail', params, error instanceof Error ? error.message : 'Unknown error');
  }
};

const SendEmailMacro: MacroComponentDefinition<typeof SendEmail> = {
  nameSpace: GOOGLE_NS,
  name: 'SendEmail',
  version: GOOGLE_VERSION,
  component: SendEmail,
  description: 'Send an email via Gmail on behalf of the connected user',
  alias: 'SendEmail',
  runat: 'server',
  icon: 'send',
  roles: ROLE_SET,
  tags: ['google', 'gmail', 'email', 'send'],
  tools: [
    {
      type: 'function',
      roles: ROLE_SET,
      function: {
        name: 'SendEmail',
        icon: 'send',
        description: 'Compose and send an email via Gmail on behalf of the connected user.',
        parameters: {
          type: 'object',
          properties: {
            to: { type: 'array', items: { type: 'string' }, description: 'Recipient email addresses' },
            cc: { type: 'array', items: { type: 'string' }, description: 'CC recipients' },
            bcc: { type: 'array', items: { type: 'string' }, description: 'BCC recipients' },
            subject: { type: 'string', description: 'Email subject' },
            body: { type: 'string', description: 'Email body (HTML or plain text)' },
            isHtml: { type: 'boolean', description: 'Whether the body is HTML' },
          },
          required: ['to', 'subject', 'body'],
        },
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SearchEmail
// ─────────────────────────────────────────────────────────────────────────────
const SearchEmail = async (params: any, state: ChatState) => {
  const { context } = state;
  const gmailService = context?.getService('google.GmailService@1.0.0') as any;
  if (!gmailService) return fail('SearchEmail', params, 'Gmail Service not available');
  try {
    // `metadata` keeps search results compact (headers + snippet, no body); pass
    // bodyFormat: 'text' when full message bodies are actually needed.
    const data = await gmailService.listMessages(String(context.user?._id), {
      query: params.query,
      maxResults: params.maxResults || 10,
      bodyFormat: params.bodyFormat || 'metadata',
    });
    return ok('SearchEmail', params, data);
  } catch (error) {
    return fail('SearchEmail', params, error instanceof Error ? error.message : 'Unknown error');
  }
};

const SearchEmailMacro: MacroComponentDefinition<typeof SearchEmail> = {
  nameSpace: GOOGLE_NS,
  name: 'SearchEmail',
  version: GOOGLE_VERSION,
  component: SearchEmail,
  description: 'Search Gmail messages using Gmail query syntax',
  alias: 'SearchEmail',
  runat: 'server',
  icon: 'search',
  roles: ROLE_SET,
  tags: ['google', 'gmail', 'search', 'email'],
  tools: [
    {
      type: 'function',
      roles: ROLE_SET,
      safeForAutoExecution: true,
      function: {
        name: 'SearchEmail',
        icon: 'search',
        description: 'Search Gmail messages using Gmail query syntax (e.g. "from:user@example.com is:unread"). Returns compact results by default (metadata: subject/from/date/snippet); request bodyFormat "text" for message bodies.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Gmail search query (e.g. "from:user@example.com")' },
            maxResults: { type: 'number', description: 'Maximum results to return (default 10)' },
            bodyFormat: { type: 'string', description: 'Body detail: metadata (headers+snippet only, default), text (plain text, HTML stripped), html, or full' },
          },
          required: ['query'],
        },
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// CreateCalendarEvent
// ─────────────────────────────────────────────────────────────────────────────
const CreateCalendarEvent = async (params: any, state: ChatState) => {
  const { context } = state;
  const calendarService = context?.getService('google.CalendarService@1.0.0') as any;
  if (!calendarService) return fail('CreateCalendarEvent', params, 'Calendar Service not available');
  try {
    const { calendarId = 'primary', ...eventData } = params;
    const data = await calendarService.createEvent(String(context.user?._id), calendarId, eventData);
    return ok('CreateCalendarEvent', params, data, 'Calendar event created');
  } catch (error) {
    return fail('CreateCalendarEvent', params, error instanceof Error ? error.message : 'Unknown error');
  }
};

const CreateEventMacro: MacroComponentDefinition<typeof CreateCalendarEvent> = {
  nameSpace: GOOGLE_NS,
  name: 'CreateCalendarEvent',
  version: GOOGLE_VERSION,
  component: CreateCalendarEvent,
  description: 'Create a Google Calendar event for the connected user',
  alias: 'CreateCalendarEvent',
  runat: 'server',
  icon: 'event',
  roles: ROLE_SET,
  tags: ['google', 'calendar', 'event', 'create'],
  tools: [
    {
      type: 'function',
      roles: ROLE_SET,
      function: {
        name: 'CreateCalendarEvent',
        icon: 'event',
        description: 'Create a Google Calendar event for the connected user.',
        parameters: {
          type: 'object',
          properties: {
            summary: { type: 'string', description: 'Event title' },
            startDateTime: { type: 'string', description: 'Start date/time in ISO 8601 format' },
            endDateTime: { type: 'string', description: 'End date/time in ISO 8601 format' },
            description: { type: 'string', description: 'Event description' },
            location: { type: 'string', description: 'Event location' },
            attendeeEmails: { type: 'array', items: { type: 'string' }, description: 'Attendee email addresses' },
            calendarId: { type: 'string', description: 'Calendar ID (default: primary)' },
          },
          required: ['summary', 'startDateTime', 'endDateTime'],
        },
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ListCalendarEvents
// ─────────────────────────────────────────────────────────────────────────────
const ListCalendarEvents = async (params: any, state: ChatState) => {
  const { context } = state;
  const calendarService = context?.getService('google.CalendarService@1.0.0') as any;
  if (!calendarService) return fail('ListCalendarEvents', params, 'Calendar Service not available');
  try {
    const { calendarId = 'primary', ...options } = params;
    const data = await calendarService.listEvents(String(context.user?._id), calendarId, options);
    return ok('ListCalendarEvents', params, data);
  } catch (error) {
    return fail('ListCalendarEvents', params, error instanceof Error ? error.message : 'Unknown error');
  }
};

const ListEventsMacro: MacroComponentDefinition<typeof ListCalendarEvents> = {
  nameSpace: GOOGLE_NS,
  name: 'ListCalendarEvents',
  version: GOOGLE_VERSION,
  component: ListCalendarEvents,
  description: 'List upcoming Google Calendar events',
  alias: 'ListCalendarEvents',
  runat: 'server',
  icon: 'event_note',
  roles: ROLE_SET,
  tags: ['google', 'calendar', 'events', 'list'],
  tools: [
    {
      type: 'function',
      roles: ROLE_SET,
      safeForAutoExecution: true,
      function: {
        name: 'ListCalendarEvents',
        icon: 'event_note',
        description: 'List upcoming Google Calendar events for the connected user.',
        parameters: {
          type: 'object',
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID (default: primary)' },
            timeMin: { type: 'string', description: 'Start of time range (ISO 8601)' },
            timeMax: { type: 'string', description: 'End of time range (ISO 8601)' },
            maxResults: { type: 'number', description: 'Maximum events to return' },
          },
          required: [],
        },
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SearchDrive
// ─────────────────────────────────────────────────────────────────────────────
const SearchDrive = async (params: any, state: ChatState) => {
  const { context } = state;
  const driveService = context?.getService('google.DriveService@1.0.0') as any;
  if (!driveService) return fail('SearchDrive', params, 'Drive Service not available');
  try {
    const data = await driveService.searchFiles(String(context.user?._id), params.query, {
      pageSize: params.pageSize || 20,
    });
    return ok('SearchDrive', params, data);
  } catch (error) {
    return fail('SearchDrive', params, error instanceof Error ? error.message : 'Unknown error');
  }
};

const SearchDriveMacro: MacroComponentDefinition<typeof SearchDrive> = {
  nameSpace: GOOGLE_NS,
  name: 'SearchDrive',
  version: GOOGLE_VERSION,
  component: SearchDrive,
  description: 'Search for files in Google Drive',
  alias: 'SearchDrive',
  runat: 'server',
  icon: 'folder',
  roles: ROLE_SET,
  tags: ['google', 'drive', 'search', 'files'],
  tools: [
    {
      type: 'function',
      roles: ROLE_SET,
      safeForAutoExecution: true,
      function: {
        name: 'SearchDrive',
        icon: 'folder',
        description: 'Search for files in Google Drive.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Drive search query' },
            pageSize: { type: 'number', description: 'Maximum files to return (default 20)' },
          },
          required: ['query'],
        },
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ReadSpreadsheet
// ─────────────────────────────────────────────────────────────────────────────
const ReadSpreadsheet = async (params: any, state: ChatState) => {
  const { context } = state;
  const sheetsService = context?.getService('google.SheetsService@1.0.0') as any;
  if (!sheetsService) return fail('ReadSpreadsheet', params, 'Sheets Service not available');
  try {
    const data = await sheetsService.getValues(
      String(context.user?._id),
      params.spreadsheetId,
      params.range,
    );
    return ok('ReadSpreadsheet', params, data);
  } catch (error) {
    return fail('ReadSpreadsheet', params, error instanceof Error ? error.message : 'Unknown error');
  }
};

const ReadSheetMacro: MacroComponentDefinition<typeof ReadSpreadsheet> = {
  nameSpace: GOOGLE_NS,
  name: 'ReadSpreadsheet',
  version: GOOGLE_VERSION,
  component: ReadSpreadsheet,
  description: 'Read values from a Google Sheets spreadsheet',
  alias: 'ReadSpreadsheet',
  runat: 'server',
  icon: 'table_chart',
  roles: ROLE_SET,
  tags: ['google', 'sheets', 'read', 'spreadsheet'],
  tools: [
    {
      type: 'function',
      roles: ROLE_SET,
      safeForAutoExecution: true,
      function: {
        name: 'ReadSpreadsheet',
        icon: 'table_chart',
        description: 'Read values from a Google Sheets spreadsheet range.',
        parameters: {
          type: 'object',
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            range: { type: 'string', description: 'A1 notation range (e.g. "Sheet1!A1:C10")' },
          },
          required: ['spreadsheetId', 'range'],
        },
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// CreateGoogleDoc
// ─────────────────────────────────────────────────────────────────────────────
const CreateGoogleDoc = async (params: any, state: ChatState) => {
  const { context } = state;
  const docsService = context?.getService('google.DocsService@1.0.0') as any;
  if (!docsService) return fail('CreateGoogleDoc', params, 'Docs Service not available');
  try {
    const data = await docsService.createDocument(
      String(context.user?._id),
      params.title,
      params.folderId,
    );
    return ok('CreateGoogleDoc', params, data, 'Document created');
  } catch (error) {
    return fail('CreateGoogleDoc', params, error instanceof Error ? error.message : 'Unknown error');
  }
};

const CreateDocMacro: MacroComponentDefinition<typeof CreateGoogleDoc> = {
  nameSpace: GOOGLE_NS,
  name: 'CreateGoogleDoc',
  version: GOOGLE_VERSION,
  component: CreateGoogleDoc,
  description: 'Create a new Google Docs document',
  alias: 'CreateGoogleDoc',
  runat: 'server',
  icon: 'description',
  roles: ROLE_SET,
  tags: ['google', 'docs', 'create', 'document'],
  tools: [
    {
      type: 'function',
      roles: ROLE_SET,
      function: {
        name: 'CreateGoogleDoc',
        icon: 'description',
        description: 'Create a new Google Docs document, optionally in a Drive folder.',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Document title' },
            folderId: { type: 'string', description: 'Drive folder ID to create the doc in' },
          },
          required: ['title'],
        },
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ListContacts
// ─────────────────────────────────────────────────────────────────────────────
const ListContacts = async (params: any, state: ChatState) => {
  const { context } = state;
  const contactsService = context?.getService('google.ContactsService@1.0.0') as any;
  if (!contactsService) return fail('ListContacts', params, 'Contacts Service not available');
  try {
    const data = params.query
      ? await contactsService.searchContacts(String(context.user?._id), params.query)
      : await contactsService.listContacts(String(context.user?._id), {
          pageSize: params.pageSize || 20,
        });
    return ok('ListContacts', params, data);
  } catch (error) {
    return fail('ListContacts', params, error instanceof Error ? error.message : 'Unknown error');
  }
};

const ListContactsMacro: MacroComponentDefinition<typeof ListContacts> = {
  nameSpace: GOOGLE_NS,
  name: 'ListContacts',
  version: GOOGLE_VERSION,
  component: ListContacts,
  description: "List or search the user's Google Contacts",
  alias: 'ListContacts',
  runat: 'server',
  icon: 'contacts',
  roles: ROLE_SET,
  tags: ['google', 'contacts', 'people', 'list'],
  tools: [
    {
      type: 'function',
      roles: ROLE_SET,
      safeForAutoExecution: true,
      function: {
        name: 'ListContacts',
        icon: 'contacts',
        description: "List or search the user's Google Contacts (searches when a query is provided).",
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query for contacts' },
            pageSize: { type: 'number', description: 'Maximum contacts to return (default 20)' },
          },
          required: [],
        },
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// CreateTask
// ─────────────────────────────────────────────────────────────────────────────
const CreateTask = async (params: any, state: ChatState) => {
  const { context } = state;
  const tasksService = context?.getService('google.TasksService@1.0.0') as any;
  if (!tasksService) return fail('CreateTask', params, 'Tasks Service not available');
  try {
    const { taskListId = '@default', ...taskData } = params;
    const data = await tasksService.createTask(String(context.user?._id), taskListId, taskData);
    return ok('CreateTask', params, data, 'Task created');
  } catch (error) {
    return fail('CreateTask', params, error instanceof Error ? error.message : 'Unknown error');
  }
};

const CreateTaskMacro: MacroComponentDefinition<typeof CreateTask> = {
  nameSpace: GOOGLE_NS,
  name: 'CreateTask',
  version: GOOGLE_VERSION,
  component: CreateTask,
  description: 'Create a task in Google Tasks',
  alias: 'CreateTask',
  runat: 'server',
  icon: 'task_alt',
  roles: ROLE_SET,
  tags: ['google', 'tasks', 'create', 'todo'],
  tools: [
    {
      type: 'function',
      roles: ROLE_SET,
      function: {
        name: 'CreateTask',
        icon: 'task_alt',
        description: 'Create a task in Google Tasks.',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Task title' },
            notes: { type: 'string', description: 'Task notes or description' },
            due: { type: 'string', description: 'Due date in RFC 3339 format' },
            taskListId: { type: 'string', description: 'Task list ID (default: @default)' },
          },
          required: ['title'],
        },
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────
export const GOOGLE_MACROS: MacroComponentDefinition<unknown>[] = [
  GetConnectionStatusMacro,
  GetAuthUrlMacro,
  SendEmailMacro,
  SearchEmailMacro,
  CreateEventMacro,
  ListEventsMacro,
  SearchDriveMacro,
  ReadSheetMacro,
  CreateDocMacro,
  ListContactsMacro,
  CreateTaskMacro,
];

/**
 * Flattened tool definitions contributed by the Google macros. Personas expose
 * these as their callable tools (`MacroToolDefinition[]`).
 */
export const GOOGLE_TOOLS: MacroToolDefinition[] = GOOGLE_MACROS.flatMap(
  (macro) => macro.tools ?? [],
);

export {
  GetConnectionStatusMacro,
  GetAuthUrlMacro,
  SendEmailMacro,
  SearchEmailMacro,
  CreateEventMacro,
  ListEventsMacro,
  SearchDriveMacro,
  ReadSheetMacro,
  CreateDocMacro,
  ListContactsMacro,
  CreateTaskMacro,
};

export default GOOGLE_MACROS;
