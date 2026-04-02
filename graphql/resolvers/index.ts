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
