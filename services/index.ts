import Reactory from '@reactorynet/reactory-core';
import { GoogleAuditServiceDefinition } from './GoogleAuditService';
import { GoogleAuthServiceDefinition } from './GoogleAuthService';
import { GmailServiceDefinition } from './GmailService';
import { CalendarServiceDefinition } from './CalendarService';
import { DriveServiceDefinition } from './DriveService';
import { DocsServiceDefinition } from './DocsService';
import { SheetsServiceDefinition } from './SheetsService';
import { ContactsServiceDefinition } from './ContactsService';
import { TasksServiceDefinition } from './TasksService';
import { GoogleServiceDefinition } from './GoogleService';

const services: Reactory.Service.IReactoryServiceDefinition<any>[] = [
  GoogleAuditServiceDefinition,
  GoogleAuthServiceDefinition,
  GmailServiceDefinition,
  CalendarServiceDefinition,
  DriveServiceDefinition,
  DocsServiceDefinition,
  SheetsServiceDefinition,
  ContactsServiceDefinition,
  TasksServiceDefinition,
  GoogleServiceDefinition,
];

export default services;
