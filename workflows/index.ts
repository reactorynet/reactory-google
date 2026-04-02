/**
 * Google Workspace Workflow Definitions
 * Workflow configurations for Google Workspace background operations.
 */

const SendEmailWorkflow = {
  id: 'google.SendEmailWorkflow',
  nameSpace: 'google',
  name: 'SendEmailWorkflow',
  version: '1.0.0',
  description: 'Send an email via Gmail as a workflow step',
  steps: [
    {
      id: 'validate',
      name: 'Validate Input',
      type: 'validation',
    },
    {
      id: 'send',
      name: 'Send Email',
      type: 'service',
      service: 'google.GmailService@1.0.0',
      method: 'sendMessage',
    },
    {
      id: 'audit',
      name: 'Audit Log',
      type: 'service',
      service: 'google.GoogleAuditService@1.0.0',
      method: 'logApiCall',
    },
  ],
};

const CreateEventWorkflow = {
  id: 'google.CreateEventWorkflow',
  nameSpace: 'google',
  name: 'CreateEventWorkflow',
  version: '1.0.0',
  description: 'Create a Google Calendar event as a workflow step',
  steps: [
    {
      id: 'validate',
      name: 'Validate Input',
      type: 'validation',
    },
    {
      id: 'create',
      name: 'Create Event',
      type: 'service',
      service: 'google.CalendarService@1.0.0',
      method: 'createEvent',
    },
  ],
};

const GmailSyncWorkflow = {
  id: 'google.GmailSyncWorkflow',
  nameSpace: 'google',
  name: 'GmailSyncWorkflow',
  version: '1.0.0',
  description: 'Sync Gmail messages for a user',
  steps: [
    {
      id: 'getToken',
      name: 'Get Auth Token',
      type: 'service',
      service: 'google.GoogleAuthService@1.0.0',
      method: 'hasValidToken',
    },
    {
      id: 'sync',
      name: 'Sync Messages',
      type: 'service',
      service: 'google.GmailService@1.0.0',
      method: 'listMessages',
    },
  ],
};

const CalendarSyncWorkflow = {
  id: 'google.CalendarSyncWorkflow',
  nameSpace: 'google',
  name: 'CalendarSyncWorkflow',
  version: '1.0.0',
  description: 'Sync Google Calendar events for a user',
  steps: [
    {
      id: 'getToken',
      name: 'Get Auth Token',
      type: 'service',
      service: 'google.GoogleAuthService@1.0.0',
      method: 'hasValidToken',
    },
    {
      id: 'sync',
      name: 'Sync Events',
      type: 'service',
      service: 'google.CalendarService@1.0.0',
      method: 'listEvents',
    },
  ],
};

const DriveSyncWorkflow = {
  id: 'google.DriveSyncWorkflow',
  nameSpace: 'google',
  name: 'DriveSyncWorkflow',
  version: '1.0.0',
  description: 'Sync Google Drive files for a user',
  steps: [
    {
      id: 'getToken',
      name: 'Get Auth Token',
      type: 'service',
      service: 'google.GoogleAuthService@1.0.0',
      method: 'hasValidToken',
    },
    {
      id: 'sync',
      name: 'Sync Files',
      type: 'service',
      service: 'google.DriveService@1.0.0',
      method: 'listFiles',
    },
  ],
};

const workflows = [
  SendEmailWorkflow,
  CreateEventWorkflow,
  GmailSyncWorkflow,
  CalendarSyncWorkflow,
  DriveSyncWorkflow,
];

export default workflows;

