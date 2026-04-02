import Reactory from '@reactorynet/reactory-core';
import { service } from '@reactory/server-core/application/decorators/service';
import { google } from 'googleapis';
import {
  IGoogleCalendar,
  ICalendarEvent,
  ICalendarEventList,
  ICalendarListOptions,
  ICalendarEventInput,
  IFreeBusyResponse,
} from '../types/calendar.types';
import { GoogleWebhookChannel } from '../models/GoogleWebhookChannel';

const CALENDAR_LIST_CACHE_TTL = 600;

@service({
  id: 'google.CalendarService@1.0.0',
  name: 'CalendarService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google Calendar API operations service',
  serviceType: 'data',
  lifeCycle: 'singleton',
  dependencies: [
    { id: 'google.GoogleAuthService@1.0.0', alias: 'googleAuthService' },
    { id: 'core.RedisService@1.0.0', alias: 'redisService' },
  ],
})
class CalendarService implements Reactory.Service.IReactoryService {
  name: string = 'CalendarService';
  nameSpace: string = 'google';
  version: string = '1.0.0';
  context: Reactory.Server.IReactoryContext;

  constructor(
    _props: Reactory.Service.IReactoryServiceProps,
    context: Reactory.Server.IReactoryContext
  ) {
    this.context = context;
  }

  private get authService(): any {
    return this.context.getService('google.GoogleAuthService@1.0.0');
  }

  private get redisService(): any {
    return this.context.getService('core.RedisService@1.0.0');
  }

  private getUserId(): string {
    return String(this.context.user?._id);
  }

  private async getClient() {
    const userId = this.getUserId();
    const authClient = await this.authService.getAuthorizedClient(userId);
    return google.calendar({ version: 'v3', auth: authClient });
  }

  private calendarListCacheKey(): string {
    return `google:${this.getUserId()}:calendar:list`;
  }

  async listCalendars(): Promise<IGoogleCalendar[]> {
    const cacheKey = this.calendarListCacheKey();
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    const calendar = await this.getClient();
    const res = await calendar.calendarList.list({});
    const calendars = (res.data.items || []).map((c: any) => ({
      id: c.id,
      summary: c.summary,
      description: c.description,
      timeZone: c.timeZone,
      backgroundColor: c.backgroundColor,
      foregroundColor: c.foregroundColor,
      accessRole: c.accessRole,
      primary: c.primary,
      selected: c.selected,
    })) as IGoogleCalendar[];

    await this.redisService.set(cacheKey, JSON.stringify(calendars), CALENDAR_LIST_CACHE_TTL).catch(() => {});
    return calendars;
  }

  async getCalendar(calendarId: string): Promise<IGoogleCalendar> {
    const calendar = await this.getClient();
    const res = await calendar.calendars.get({ calendarId });
    return {
      id: res.data.id || calendarId,
      summary: res.data.summary || '',
      description: res.data.description || undefined,
      timeZone: res.data.timeZone || undefined,
    };
  }

  async createCalendar(name: string, options: any = {}): Promise<IGoogleCalendar> {
    const calendar = await this.getClient();
    const res = await calendar.calendars.insert({
      requestBody: { summary: name, ...options },
    });
    await this.redisService.del(this.calendarListCacheKey()).catch(() => {});
    return {
      id: res.data.id || '',
      summary: res.data.summary || name,
    };
  }

  async deleteCalendar(calendarId: string): Promise<void> {
    const calendar = await this.getClient();
    await calendar.calendars.delete({ calendarId });
    await this.redisService.del(this.calendarListCacheKey()).catch(() => {});
  }

  async listEvents(
    calendarId: string,
    options: ICalendarListOptions = {}
  ): Promise<ICalendarEventList> {
    const calendar = await this.getClient();
    const res = await calendar.events.list({
      calendarId,
      timeMin: options.timeMin,
      timeMax: options.timeMax,
      q: options.query,
      maxResults: options.maxResults || 100,
      pageToken: options.pageToken,
      singleEvents: options.singleEvents !== false,
      orderBy: options.orderBy || 'startTime',
      syncToken: options.syncToken,
    });

    return {
      events: (res.data.items || []) as ICalendarEvent[],
      nextPageToken: res.data.nextPageToken || undefined,
      nextSyncToken: res.data.nextSyncToken || undefined,
    };
  }

  async getEvent(calendarId: string, eventId: string): Promise<ICalendarEvent> {
    const calendar = await this.getClient();
    const res = await calendar.events.get({ calendarId, eventId });
    return res.data as ICalendarEvent;
  }

  async createEvent(calendarId: string, event: ICalendarEventInput): Promise<ICalendarEvent> {
    const calendar = await this.getClient();
    const res = await calendar.events.insert({
      calendarId,
      requestBody: event as any,
    });
    return res.data as ICalendarEvent;
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    event: Partial<ICalendarEventInput>
  ): Promise<ICalendarEvent> {
    const calendar = await this.getClient();
    const res = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: event as any,
    });
    return res.data as ICalendarEvent;
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    const calendar = await this.getClient();
    await calendar.events.delete({ calendarId, eventId });
  }

  async moveEvent(
    calendarId: string,
    eventId: string,
    destinationCalendarId: string
  ): Promise<ICalendarEvent> {
    const calendar = await this.getClient();
    const res = await calendar.events.move({
      calendarId,
      eventId,
      destination: destinationCalendarId,
    });
    return res.data as ICalendarEvent;
  }

  async quickAddEvent(calendarId: string, text: string): Promise<ICalendarEvent> {
    const calendar = await this.getClient();
    const res = await calendar.events.quickAdd({ calendarId, text });
    return res.data as ICalendarEvent;
  }

  async getFreeBusy(
    timeMin: string,
    timeMax: string,
    calendars: string[]
  ): Promise<IFreeBusyResponse> {
    const calendar = await this.getClient();
    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: calendars.map((id) => ({ id })),
      },
    });
    return res.data as IFreeBusyResponse;
  }

  async listEventInstances(
    calendarId: string,
    eventId: string
  ): Promise<ICalendarEvent[]> {
    const calendar = await this.getClient();
    const res = await calendar.events.instances({ calendarId, eventId });
    return (res.data.items || []) as ICalendarEvent[];
  }

  async watchEvents(calendarId: string): Promise<any> {
    const calendar = await this.getClient();
    const userId = this.getUserId();
    const channelId = `calendar-${userId}-${Date.now()}`;

    const res = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: `${process.env.GOOGLE_WEBHOOK_BASE_URL}/api/google/webhooks/pubsub`,
        token: process.env.GOOGLE_PUBSUB_VERIFICATION_TOKEN,
      },
    });

    await GoogleWebhookChannel.findOneAndUpdate(
      { userId, service: 'calendar', resourceId: calendarId },
      {
        userId,
        channelId,
        resourceId: res.data.resourceId || calendarId,
        service: 'calendar',
        expiration: new Date(Number(res.data.expiration)),
        token: process.env.GOOGLE_PUBSUB_VERIFICATION_TOKEN || '',
        active: true,
      },
      { upsert: true, new: true }
    );

    return res.data;
  }
}

export const CalendarServiceDefinition: Reactory.Service.IReactoryServiceDefinition<CalendarService> = {
  service: (props: any, context: any) => new CalendarService(props, context),
  id: 'google.CalendarService@1.0.0',
  name: 'CalendarService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google Calendar API operations service',
  serviceType: 'data',
  dependencies: [
    { id: 'google.GoogleAuthService@1.0.0', alias: 'googleAuthService' },
    { id: 'core.RedisService@1.0.0', alias: 'redisService' },
  ],
};

export { CalendarService };
