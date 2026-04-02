import Reactory from '@reactorynet/reactory-core';

const GoogleAccountConnectionForm: Reactory.Forms.IReactoryForm = {
  id: 'google.GoogleAccountConnectionForm@1.0.0',
  nameSpace: 'google',
  name: 'GoogleAccountConnectionForm',
  version: '1.0.0',
  title: 'Google Account Connection',
  description: 'Connect and manage your Google Workspace account',
  schema: {
    type: 'object',
    title: 'Google Account',
    properties: {
      connectionStatus: { type: 'string', title: 'Connection Status' },
      email: { type: 'string', title: 'Email Address' },
      connectedAt: { type: 'string', title: 'Connected At' },
      grantedScopes: { type: 'array', title: 'Granted Scopes', items: { type: 'string' } },
    },
  },
  uiSchema: {
    connectionStatus: { 'ui:widget': 'label' },
    email: { 'ui:widget': 'label' },
    connectedAt: { 'ui:widget': 'label' },
    grantedScopes: { 'ui:widget': 'tags' },
  },
  graphql: {
    query: {
      name: 'googleConnectionStatus',
      text: `query GoogleConnectionStatus {
        googleConnectionStatus {
          status email connectedAt grantedScopes
        }
      }`,
      variables: {},
      resultMap: {},
      new: {},
      edit: {},
      delete: {},
      onError: [],
    },
    mutation: {
      new: { name: '', text: '', variables: {}, options: {} },
      edit: { name: '', text: '', variables: {}, options: {} },
      delete: { name: '', text: '', variables: {}, options: {} },
    },
  },
};

const GmailInboxForm: Reactory.Forms.IReactoryForm = {
  id: 'google.GmailInboxForm@1.0.0',
  nameSpace: 'google',
  name: 'GmailInboxForm',
  version: '1.0.0',
  title: 'Gmail Inbox',
  description: 'View and manage your Gmail inbox',
  schema: {
    type: 'object',
    properties: {
      labelIds: { type: 'array', title: 'Labels', items: { type: 'string' } },
      query: { type: 'string', title: 'Search' },
      maxResults: { type: 'number', title: 'Max Results', default: 25 },
    },
  },
  uiSchema: {
    query: { 'ui:placeholder': 'Search mail...' },
    maxResults: { 'ui:widget': 'updown' },
  },
  graphql: {
    query: {
      name: 'gmailMessages',
      text: `query GmailMessages($labelIds: [String!], $query: String, $maxResults: Int) {
        gmailMessages(labelIds: $labelIds, query: $query, maxResults: $maxResults) {
          messages { id threadId snippet labelIds sizeEstimate }
          nextPageToken resultSizeEstimate
        }
      }`,
      variables: {},
      resultMap: {},
      new: {},
      edit: {},
      delete: {},
      onError: [],
    },
    mutation: {
      new: { name: '', text: '', variables: {}, options: {} },
      edit: { name: '', text: '', variables: {}, options: {} },
      delete: { name: '', text: '', variables: {}, options: {} },
    },
  },
};

const GmailComposeForm: Reactory.Forms.IReactoryForm = {
  id: 'google.GmailComposeForm@1.0.0',
  nameSpace: 'google',
  name: 'GmailComposeForm',
  version: '1.0.0',
  title: 'Compose Email',
  description: 'Compose and send an email via Gmail',
  schema: {
    type: 'object',
    required: ['to', 'subject', 'body'],
    properties: {
      to: { type: 'array', title: 'To', items: { type: 'string', format: 'email' } },
      cc: { type: 'array', title: 'CC', items: { type: 'string', format: 'email' } },
      bcc: { type: 'array', title: 'BCC', items: { type: 'string', format: 'email' } },
      subject: { type: 'string', title: 'Subject' },
      body: { type: 'string', title: 'Body' },
      isHtml: { type: 'boolean', title: 'HTML Email', default: false },
    },
  },
  uiSchema: {
    to: { 'ui:widget': 'tags' },
    cc: { 'ui:widget': 'tags' },
    bcc: { 'ui:widget': 'tags' },
    body: { 'ui:widget': 'textarea', 'ui:options': { rows: 10 } },
  },
  graphql: {
    query: {
      name: '',
      text: '',
      variables: {},
      resultMap: {},
      new: {},
      edit: {},
      delete: {},
      onError: [],
    },
    mutation: {
      new: {
        name: 'gmailSendMessage',
        text: `mutation GmailSendMessage($input: GmailSendMessageInput!) {
          gmailSendMessage(input: $input) { id threadId snippet }
        }`,
        variables: {},
        options: {},
      },
      edit: { name: '', text: '', variables: {}, options: {} },
      delete: { name: '', text: '', variables: {}, options: {} },
    },
  },
};

const CalendarViewForm: Reactory.Forms.IReactoryForm = {
  id: 'google.CalendarViewForm@1.0.0',
  nameSpace: 'google',
  name: 'CalendarViewForm',
  version: '1.0.0',
  title: 'Calendar',
  description: 'View and manage your Google Calendar events',
  schema: {
    type: 'object',
    properties: {
      calendarId: { type: 'string', title: 'Calendar', default: 'primary' },
      timeMin: { type: 'string', title: 'From', format: 'date-time' },
      timeMax: { type: 'string', title: 'To', format: 'date-time' },
      maxResults: { type: 'number', title: 'Max Results', default: 50 },
    },
  },
  uiSchema: {
    timeMin: { 'ui:widget': 'DateTimeWidget' },
    timeMax: { 'ui:widget': 'DateTimeWidget' },
  },
  graphql: {
    query: {
      name: 'calendarEvents',
      text: `query CalendarEvents($calendarId: String, $timeMin: String, $timeMax: String, $maxResults: Int) {
        calendarEvents(calendarId: $calendarId, timeMin: $timeMin, timeMax: $timeMax, maxResults: $maxResults) {
          events { id summary description start { dateTime date } end { dateTime date } location status }
          nextPageToken
        }
      }`,
      variables: {},
      resultMap: {},
      new: {},
      edit: {},
      delete: {},
      onError: [],
    },
    mutation: {
      new: { name: '', text: '', variables: {}, options: {} },
      edit: { name: '', text: '', variables: {}, options: {} },
      delete: { name: '', text: '', variables: {}, options: {} },
    },
  },
};

const CalendarEventForm: Reactory.Forms.IReactoryForm = {
  id: 'google.CalendarEventForm@1.0.0',
  nameSpace: 'google',
  name: 'CalendarEventForm',
  version: '1.0.0',
  title: 'Calendar Event',
  description: 'Create or edit a Google Calendar event',
  schema: {
    type: 'object',
    required: ['summary', 'startDateTime', 'endDateTime'],
    properties: {
      summary: { type: 'string', title: 'Title' },
      description: { type: 'string', title: 'Description' },
      location: { type: 'string', title: 'Location' },
      startDateTime: { type: 'string', title: 'Start', format: 'date-time' },
      endDateTime: { type: 'string', title: 'End', format: 'date-time' },
      timeZone: { type: 'string', title: 'Time Zone' },
      attendeeEmails: { type: 'array', title: 'Attendees', items: { type: 'string', format: 'email' } },
      allDay: { type: 'boolean', title: 'All Day Event', default: false },
    },
  },
  uiSchema: {
    description: { 'ui:widget': 'textarea' },
    startDateTime: { 'ui:widget': 'DateTimeWidget' },
    endDateTime: { 'ui:widget': 'DateTimeWidget' },
    attendeeEmails: { 'ui:widget': 'tags' },
  },
  graphql: {
    query: {
      name: 'calendarEvent',
      text: `query CalendarEvent($calendarId: String!, $eventId: String!) {
        calendarEvent(calendarId: $calendarId, eventId: $eventId) {
          id summary description location start { dateTime date timeZone }
          end { dateTime date timeZone } attendees { email displayName responseStatus }
        }
      }`,
      variables: {},
      resultMap: {},
      new: {},
      edit: {},
      delete: {},
      onError: [],
    },
    mutation: {
      new: {
        name: 'calendarCreateEvent',
        text: `mutation CreateEvent($input: CalendarEventInput!) {
          calendarCreateEvent(input: $input) { id summary start { dateTime } end { dateTime } }
        }`,
        variables: {},
        options: {},
      },
      edit: {
        name: 'calendarUpdateEvent',
        text: `mutation UpdateEvent($calendarId: String!, $eventId: String!, $input: CalendarEventInput!) {
          calendarUpdateEvent(calendarId: $calendarId, eventId: $eventId, input: $input) { id summary }
        }`,
        variables: {},
        options: {},
      },
      delete: {
        name: 'calendarDeleteEvent',
        text: `mutation DeleteEvent($calendarId: String!, $eventId: String!) {
          calendarDeleteEvent(calendarId: $calendarId, eventId: $eventId)
        }`,
        variables: {},
        options: {},
      },
    },
  },
};

const DriveExplorerForm: Reactory.Forms.IReactoryForm = {
  id: 'google.DriveExplorerForm@1.0.0',
  nameSpace: 'google',
  name: 'DriveExplorerForm',
  version: '1.0.0',
  title: 'Drive Explorer',
  description: 'Browse and manage your Google Drive files',
  schema: {
    type: 'object',
    properties: {
      folderId: { type: 'string', title: 'Folder ID' },
      query: { type: 'string', title: 'Search' },
      orderBy: { type: 'string', title: 'Order By', default: 'modifiedTime desc' },
      pageSize: { type: 'number', title: 'Page Size', default: 50 },
    },
  },
  uiSchema: {
    query: { 'ui:placeholder': 'Search Drive...' },
  },
  graphql: {
    query: {
      name: 'driveFiles',
      text: `query DriveFiles($folderId: String, $query: String, $orderBy: String, $pageSize: Int, $pageToken: String) {
        driveFiles(folderId: $folderId, query: $query, orderBy: $orderBy, pageSize: $pageSize, pageToken: $pageToken) {
          files { id name mimeType size modifiedTime webViewLink thumbnailLink isFolder owners { displayName } }
          nextPageToken
        }
      }`,
      variables: {},
      resultMap: {},
      new: {},
      edit: {},
      delete: {},
      onError: [],
    },
    mutation: {
      new: { name: '', text: '', variables: {}, options: {} },
      edit: { name: '', text: '', variables: {}, options: {} },
      delete: {
        name: 'driveDeleteFile',
        text: `mutation DeleteFile($fileId: String!) { driveDeleteFile(fileId: $fileId) }`,
        variables: {},
        options: {},
      },
    },
  },
};

const ContactsManagerForm: Reactory.Forms.IReactoryForm = {
  id: 'google.ContactsManagerForm@1.0.0',
  nameSpace: 'google',
  name: 'ContactsManagerForm',
  version: '1.0.0',
  title: 'Contacts',
  description: 'View and manage your Google Contacts',
  schema: {
    type: 'object',
    properties: {
      pageSize: { type: 'number', title: 'Page Size', default: 50 },
      query: { type: 'string', title: 'Search Contacts' },
    },
  },
  uiSchema: {
    query: { 'ui:placeholder': 'Search contacts...' },
  },
  graphql: {
    query: {
      name: 'contacts',
      text: `query Contacts($pageSize: Int, $pageToken: String) {
        contacts(pageSize: $pageSize, pageToken: $pageToken) {
          contacts {
            resourceName names { displayName givenName familyName }
            emailAddresses { value type } phoneNumbers { value type }
          }
          nextPageToken totalPeople
        }
      }`,
      variables: {},
      resultMap: {},
      new: {},
      edit: {},
      delete: {},
      onError: [],
    },
    mutation: {
      new: { name: '', text: '', variables: {}, options: {} },
      edit: { name: '', text: '', variables: {}, options: {} },
      delete: {
        name: 'contactDelete',
        text: `mutation DeleteContact($resourceName: String!) { contactDelete(resourceName: $resourceName) }`,
        variables: {},
        options: {},
      },
    },
  },
};

const TasksManagerForm: Reactory.Forms.IReactoryForm = {
  id: 'google.TasksManagerForm@1.0.0',
  nameSpace: 'google',
  name: 'TasksManagerForm',
  version: '1.0.0',
  title: 'Tasks',
  description: 'View and manage your Google Tasks',
  schema: {
    type: 'object',
    properties: {
      taskListId: { type: 'string', title: 'Task List' },
      showCompleted: { type: 'boolean', title: 'Show Completed', default: false },
      showHidden: { type: 'boolean', title: 'Show Hidden', default: false },
    },
  },
  uiSchema: {},
  graphql: {
    query: {
      name: 'tasks',
      text: `query Tasks($taskListId: String!, $showCompleted: Boolean) {
        tasks(taskListId: $taskListId, showCompleted: $showCompleted) {
          tasks { id title notes status due completed }
          nextPageToken
        }
      }`,
      variables: {},
      resultMap: {},
      new: {},
      edit: {},
      delete: {},
      onError: [],
    },
    mutation: {
      new: {
        name: 'taskCreate',
        text: `mutation CreateTask($taskListId: String!, $input: TaskInput!) {
          taskCreate(taskListId: $taskListId, input: $input) { id title status }
        }`,
        variables: {},
        options: {},
      },
      edit: {
        name: 'taskUpdate',
        text: `mutation UpdateTask($taskListId: String!, $taskId: String!, $input: TaskInput!) {
          taskUpdate(taskListId: $taskListId, taskId: $taskId, input: $input) { id title status }
        }`,
        variables: {},
        options: {},
      },
      delete: {
        name: 'taskDelete',
        text: `mutation DeleteTask($taskListId: String!, $taskId: String!) {
          taskDelete(taskListId: $taskListId, taskId: $taskId)
        }`,
        variables: {},
        options: {},
      },
    },
  },
};

const forms: Reactory.Forms.IReactoryForm[] = [
  GoogleAccountConnectionForm,
  GmailInboxForm,
  GmailComposeForm,
  CalendarViewForm,
  CalendarEventForm,
  DriveExplorerForm,
  ContactsManagerForm,
  TasksManagerForm,
];

export default forms;

