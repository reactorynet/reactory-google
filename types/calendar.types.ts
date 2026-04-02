/**
 * Google Calendar-specific TypeScript types
 */

export enum EventStatus {
  CONFIRMED = 'confirmed',
  TENTATIVE = 'tentative',
  CANCELLED = 'cancelled',
}

export enum EventVisibility {
  DEFAULT = 'default',
  PUBLIC = 'public',
  PRIVATE = 'private',
  CONFIDENTIAL = 'confidential',
}

export enum AttendeeResponseStatus {
  NEEDS_ACTION = 'needsAction',
  DECLINED = 'declined',
  TENTATIVE = 'tentative',
  ACCEPTED = 'accepted',
}

export interface IEventDateTime {
  date?: string;
  dateTime?: string;
  timeZone?: string;
}

export interface IEventAttendee {
  email: string;
  displayName?: string;
  organizer?: boolean;
  self?: boolean;
  resource?: boolean;
  optional?: boolean;
  responseStatus?: AttendeeResponseStatus;
  comment?: string;
  additionalGuests?: number;
}

export interface IReminderOverride {
  method: 'email' | 'popup';
  minutes: number;
}

export interface IEventReminders {
  useDefault?: boolean;
  overrides?: IReminderOverride[];
}

export interface ICalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: IEventDateTime;
  end: IEventDateTime;
  status?: EventStatus;
  visibility?: EventVisibility;
  colorId?: string;
  creator?: { email: string; displayName?: string };
  organizer?: { email: string; displayName?: string };
  attendees?: IEventAttendee[];
  reminders?: IEventReminders;
  recurrence?: string[];
  recurringEventId?: string;
  htmlLink?: string;
  iCalUID?: string;
  created?: string;
  updated?: string;
  etag?: string;
}

export interface IGoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole?: string;
  primary?: boolean;
  selected?: boolean;
}

export interface ICalendarEventList {
  events: ICalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

export interface ICalendarListOptions {
  timeMin?: string;
  timeMax?: string;
  query?: string;
  maxResults?: number;
  pageToken?: string;
  singleEvents?: boolean;
  orderBy?: 'startTime' | 'updated';
  syncToken?: string;
}

export interface ICalendarEventInput {
  summary: string;
  description?: string;
  location?: string;
  start: IEventDateTime;
  end: IEventDateTime;
  attendees?: Array<{ email: string; displayName?: string }>;
  reminders?: IEventReminders;
  recurrence?: string[];
  visibility?: EventVisibility;
  colorId?: string;
}

export interface IFreeBusyCalendar {
  busy?: Array<{ start: string; end: string }>;
  errors?: Array<{ domain: string; reason: string }>;
}

export interface IFreeBusyResponse {
  kind?: string;
  timeMin?: string;
  timeMax?: string;
  calendars?: Record<string, IFreeBusyCalendar>;
}
