import Reactory from '@reactorynet/reactory-core';
import { service } from '@reactory/server-core/application/decorators/service';
import { IGoogleConnection } from '../types/google.types';

/**
 * GoogleService — Orchestrator service that provides access to all Google sub-services.
 */
@service({
  id: 'google.GoogleService@1.0.0',
  name: 'GoogleService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google Workspace orchestration service',
  serviceType: 'integration',
  lifeCycle: 'singleton',
  dependencies: [
    { id: 'google.GoogleAuthService@1.0.0', alias: 'googleAuthService' },
    { id: 'google.GmailService@1.0.0', alias: 'gmailService' },
    { id: 'google.CalendarService@1.0.0', alias: 'calendarService' },
    { id: 'google.DriveService@1.0.0', alias: 'driveService' },
    { id: 'google.DocsService@1.0.0', alias: 'docsService' },
    { id: 'google.SheetsService@1.0.0', alias: 'sheetsService' },
    { id: 'google.ContactsService@1.0.0', alias: 'contactsService' },
    { id: 'google.TasksService@1.0.0', alias: 'tasksService' },
    { id: 'google.GoogleAuditService@1.0.0', alias: 'googleAuditService' },
  ],
})
class GoogleService implements Reactory.Service.IReactoryService {
  name: string = 'GoogleService';
  nameSpace: string = 'google';
  version: string = '1.0.0';
  context: Reactory.Server.IReactoryContext;

  constructor(
    _props: Reactory.Service.IReactoryServiceProps,
    context: Reactory.Server.IReactoryContext
  ) {
    this.context = context;
  }

  getAuthService(): any {
    return this.context.getService('google.GoogleAuthService@1.0.0');
  }

  getGmailService(): any {
    return this.context.getService('google.GmailService@1.0.0');
  }

  getCalendarService(): any {
    return this.context.getService('google.CalendarService@1.0.0');
  }

  getDriveService(): any {
    return this.context.getService('google.DriveService@1.0.0');
  }

  getDocsService(): any {
    return this.context.getService('google.DocsService@1.0.0');
  }

  getSheetsService(): any {
    return this.context.getService('google.SheetsService@1.0.0');
  }

  getContactsService(): any {
    return this.context.getService('google.ContactsService@1.0.0');
  }

  getTasksService(): any {
    return this.context.getService('google.TasksService@1.0.0');
  }

  getAuditService(): any {
    return this.context.getService('google.GoogleAuditService@1.0.0');
  }

  async getConnectionStatus(userId?: string): Promise<IGoogleConnection> {
    const uid = userId || String(this.context.user?._id);
    return this.getAuthService().getConnectionStatus(uid);
  }

  async disconnectAccount(userId?: string): Promise<void> {
    const uid = userId || String(this.context.user?._id);
    return this.getAuthService().revokeAccess(uid);
  }
}

export const GoogleServiceDefinition: Reactory.Service.IReactoryServiceDefinition<GoogleService> = {
  service: (props: any, context: any) => new GoogleService(props, context),
  id: 'google.GoogleService@1.0.0',
  name: 'GoogleService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google Workspace orchestration service',
  serviceType: 'integration',
  dependencies: [
    { id: 'google.GoogleAuthService@1.0.0', alias: 'googleAuthService' },
    { id: 'google.GmailService@1.0.0', alias: 'gmailService' },
    { id: 'google.CalendarService@1.0.0', alias: 'calendarService' },
    { id: 'google.DriveService@1.0.0', alias: 'driveService' },
    { id: 'google.DocsService@1.0.0', alias: 'docsService' },
    { id: 'google.SheetsService@1.0.0', alias: 'sheetsService' },
    { id: 'google.ContactsService@1.0.0', alias: 'contactsService' },
    { id: 'google.TasksService@1.0.0', alias: 'tasksService' },
    { id: 'google.GoogleAuditService@1.0.0', alias: 'googleAuditService' },
  ],
};

export { GoogleService };
