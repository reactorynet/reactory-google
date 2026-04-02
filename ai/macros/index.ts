/**
 * Google Workspace AI Macros
 * Callable AI macros for Google Workspace operations via Reactor.
 */
import Reactory from '@reactorynet/reactory-core';

const GetConnectionStatusMacro: Reactory.AI.IMacro = {
  id: 'google.GetConnectionStatusMacro',
  name: 'GetConnectionStatus',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Check the current user\'s Google Workspace connection status',
  tags: ['google', 'auth', 'status'],
  parameters: [],
  handler: async (params: Record<string, any>, context: Reactory.Server.IReactoryContext) => {
    const authService = context.getService('google.GoogleAuthService@1.0.0') as any;
    if (!authService) return { error: 'Google Auth Service not available' };
    return authService.getConnectionStatus(String(context.user._id));
  },
};

const SendEmailMacro: Reactory.AI.IMacro = {
  id: 'google.SendEmailMacro',
  name: 'SendEmail',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Send an email via Gmail on behalf of the connected user',
  tags: ['google', 'gmail', 'email', 'send'],
  parameters: [
    { name: 'to', type: 'string[]', description: 'Recipient email addresses', required: true },
    { name: 'subject', type: 'string', description: 'Email subject', required: true },
    { name: 'body', type: 'string', description: 'Email body (HTML or plain text)', required: true },
    { name: 'isHtml', type: 'boolean', description: 'Whether the body is HTML', required: false },
    { name: 'cc', type: 'string[]', description: 'CC recipients', required: false },
  ],
  handler: async (params: Record<string, any>, context: Reactory.Server.IReactoryContext) => {
    const gmailService = context.getService('google.GmailService@1.0.0') as any;
    if (!gmailService) return { error: 'Gmail Service not available' };
    return gmailService.sendMessage(String(context.user._id), params);
  },
};

const SearchEmailMacro: Reactory.AI.IMacro = {
  id: 'google.SearchEmailMacro',
  name: 'SearchEmail',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Search Gmail messages using Gmail query syntax',
  tags: ['google', 'gmail', 'search', 'email'],
  parameters: [
    { name: 'query', type: 'string', description: 'Gmail search query (e.g. "from:user@example.com")', required: true },
    { name: 'maxResults', type: 'number', description: 'Maximum results to return', required: false },
  ],
  handler: async (params: Record<string, any>, context: Reactory.Server.IReactoryContext) => {
    const gmailService = context.getService('google.GmailService@1.0.0') as any;
    if (!gmailService) return { error: 'Gmail Service not available' };
    return gmailService.listMessages(String(context.user._id), {
      q: params.query,
      maxResults: params.maxResults || 10,
    });
  },
};

const CreateEventMacro: Reactory.AI.IMacro = {
  id: 'google.CreateEventMacro',
  name: 'CreateCalendarEvent',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Create a Google Calendar event for the connected user',
  tags: ['google', 'calendar', 'event', 'create'],
  parameters: [
    { name: 'summary', type: 'string', description: 'Event title', required: true },
    { name: 'startDateTime', type: 'string', description: 'Start date/time in ISO 8601 format', required: true },
    { name: 'endDateTime', type: 'string', description: 'End date/time in ISO 8601 format', required: true },
    { name: 'description', type: 'string', description: 'Event description', required: false },
    { name: 'location', type: 'string', description: 'Event location', required: false },
    { name: 'attendeeEmails', type: 'string[]', description: 'Attendee email addresses', required: false },
    { name: 'calendarId', type: 'string', description: 'Calendar ID (default: primary)', required: false },
  ],
  handler: async (params: Record<string, any>, context: Reactory.Server.IReactoryContext) => {
    const calendarService = context.getService('google.CalendarService@1.0.0') as any;
    if (!calendarService) return { error: 'Calendar Service not available' };
    const { calendarId = 'primary', ...eventData } = params;
    return calendarService.createEvent(String(context.user._id), calendarId, eventData);
  },
};

const ListEventsMacro: Reactory.AI.IMacro = {
  id: 'google.ListEventsMacro',
  name: 'ListCalendarEvents',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'List upcoming Google Calendar events',
  tags: ['google', 'calendar', 'events', 'list'],
  parameters: [
    { name: 'calendarId', type: 'string', description: 'Calendar ID (default: primary)', required: false },
    { name: 'timeMin', type: 'string', description: 'Start of time range (ISO 8601)', required: false },
    { name: 'timeMax', type: 'string', description: 'End of time range (ISO 8601)', required: false },
    { name: 'maxResults', type: 'number', description: 'Maximum events to return', required: false },
  ],
  handler: async (params: Record<string, any>, context: Reactory.Server.IReactoryContext) => {
    const calendarService = context.getService('google.CalendarService@1.0.0') as any;
    if (!calendarService) return { error: 'Calendar Service not available' };
    const { calendarId = 'primary', ...options } = params;
    return calendarService.listEvents(String(context.user._id), calendarId, options);
  },
};

const SearchDriveMacro: Reactory.AI.IMacro = {
  id: 'google.SearchDriveMacro',
  name: 'SearchDrive',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Search for files in Google Drive',
  tags: ['google', 'drive', 'search', 'files'],
  parameters: [
    { name: 'query', type: 'string', description: 'Drive search query', required: true },
    { name: 'pageSize', type: 'number', description: 'Maximum files to return', required: false },
  ],
  handler: async (params: Record<string, any>, context: Reactory.Server.IReactoryContext) => {
    const driveService = context.getService('google.DriveService@1.0.0') as any;
    if (!driveService) return { error: 'Drive Service not available' };
    return driveService.searchFiles(String(context.user._id), params.query, {
      pageSize: params.pageSize || 20,
    });
  },
};

const ReadSheetMacro: Reactory.AI.IMacro = {
  id: 'google.ReadSheetMacro',
  name: 'ReadSpreadsheet',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Read values from a Google Sheets spreadsheet',
  tags: ['google', 'sheets', 'read', 'spreadsheet'],
  parameters: [
    { name: 'spreadsheetId', type: 'string', description: 'Spreadsheet ID', required: true },
    { name: 'range', type: 'string', description: 'A1 notation range (e.g. "Sheet1!A1:C10")', required: true },
  ],
  handler: async (params: Record<string, any>, context: Reactory.Server.IReactoryContext) => {
    const sheetsService = context.getService('google.SheetsService@1.0.0') as any;
    if (!sheetsService) return { error: 'Sheets Service not available' };
    return sheetsService.getValues(String(context.user._id), params.spreadsheetId, params.range);
  },
};

const CreateDocMacro: Reactory.AI.IMacro = {
  id: 'google.CreateDocMacro',
  name: 'CreateGoogleDoc',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Create a new Google Docs document',
  tags: ['google', 'docs', 'create', 'document'],
  parameters: [
    { name: 'title', type: 'string', description: 'Document title', required: true },
    { name: 'folderId', type: 'string', description: 'Drive folder ID to create the doc in', required: false },
  ],
  handler: async (params: Record<string, any>, context: Reactory.Server.IReactoryContext) => {
    const docsService = context.getService('google.DocsService@1.0.0') as any;
    if (!docsService) return { error: 'Docs Service not available' };
    return docsService.createDocument(String(context.user._id), params.title, params.folderId);
  },
};

const ListContactsMacro: Reactory.AI.IMacro = {
  id: 'google.ListContactsMacro',
  name: 'ListContacts',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'List or search the user\'s Google Contacts',
  tags: ['google', 'contacts', 'people', 'list'],
  parameters: [
    { name: 'query', type: 'string', description: 'Search query for contacts', required: false },
    { name: 'pageSize', type: 'number', description: 'Maximum contacts to return', required: false },
  ],
  handler: async (params: Record<string, any>, context: Reactory.Server.IReactoryContext) => {
    const contactsService = context.getService('google.ContactsService@1.0.0') as any;
    if (!contactsService) return { error: 'Contacts Service not available' };
    if (params.query) {
      return contactsService.searchContacts(String(context.user._id), params.query);
    }
    return contactsService.listContacts(String(context.user._id), { pageSize: params.pageSize || 20 });
  },
};

const CreateTaskMacro: Reactory.AI.IMacro = {
  id: 'google.CreateTaskMacro',
  name: 'CreateTask',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Create a task in Google Tasks',
  tags: ['google', 'tasks', 'create', 'todo'],
  parameters: [
    { name: 'title', type: 'string', description: 'Task title', required: true },
    { name: 'notes', type: 'string', description: 'Task notes or description', required: false },
    { name: 'due', type: 'string', description: 'Due date in RFC 3339 format', required: false },
    { name: 'taskListId', type: 'string', description: 'Task list ID (default: @default)', required: false },
  ],
  handler: async (params: Record<string, any>, context: Reactory.Server.IReactoryContext) => {
    const tasksService = context.getService('google.TasksService@1.0.0') as any;
    if (!tasksService) return { error: 'Tasks Service not available' };
    const { taskListId = '@default', ...taskData } = params;
    return tasksService.createTask(String(context.user._id), taskListId, taskData);
  },
};

export const GOOGLE_MACROS: Reactory.AI.IMacro[] = [
  GetConnectionStatusMacro,
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

export default GOOGLE_MACROS;

