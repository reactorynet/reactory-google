import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';

@resolver
class CalendarResolver {
  resolver: any;

  private getService(context: Reactory.Server.IReactoryContext) {
    const svc = context.getService('google.CalendarService@1.0.0') as any;
    if (!svc) throw new Error('Calendar Service not available');
    return svc;
  }

  @roles(['USER'], 'args.context')
  @query('calendarList')
  async listCalendars(_obj: any, _params: Record<string, unknown>, context: Reactory.Server.IReactoryContext) {
    return this.getService(context).listCalendars(String(context.user._id));
  }

  @roles(['USER'], 'args.context')
  @query('calendarEvents')
  async listEvents(
    _obj: any,
    params: {
      calendarId?: string;
      timeMin?: string;
      timeMax?: string;
      query?: string;
      maxResults?: number;
      pageToken?: string;
    },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).listEvents(
      String(context.user._id),
      params.calendarId || 'primary',
      {
        timeMin: params.timeMin,
        timeMax: params.timeMax,
        q: params.query,
        maxResults: params.maxResults,
        pageToken: params.pageToken,
      },
    );
  }

  @roles(['USER'], 'args.context')
  @query('calendarEvent')
  async getEvent(
    _obj: any,
    params: { calendarId: string; eventId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).getEvent(String(context.user._id), params.calendarId, params.eventId);
  }

  @roles(['USER'], 'args.context')
  @query('calendarFreeBusy')
  async getFreeBusy(
    _obj: any,
    params: { timeMin: string; timeMax: string; calendarIds: string[] },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).getFreeBusy(
      String(context.user._id),
      params.timeMin,
      params.timeMax,
      params.calendarIds,
    );
  }

  @roles(['USER'], 'args.context')
  @mutation('calendarCreateEvent')
  async createEvent(
    _obj: any,
    params: { input: Record<string, any> },
    context: Reactory.Server.IReactoryContext,
  ) {
    const { calendarId, ...eventData } = params.input;
    return this.getService(context).createEvent(
      String(context.user._id),
      calendarId || 'primary',
      eventData,
    );
  }

  @roles(['USER'], 'args.context')
  @mutation('calendarUpdateEvent')
  async updateEvent(
    _obj: any,
    params: { calendarId: string; eventId: string; input: Record<string, any> },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).updateEvent(
      String(context.user._id),
      params.calendarId,
      params.eventId,
      params.input,
    );
  }

  @roles(['USER'], 'args.context')
  @mutation('calendarDeleteEvent')
  async deleteEvent(
    _obj: any,
    params: { calendarId: string; eventId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    await this.getService(context).deleteEvent(
      String(context.user._id),
      params.calendarId,
      params.eventId,
    );
    return true;
  }

  @roles(['USER'], 'args.context')
  @mutation('calendarQuickAddEvent')
  async quickAddEvent(
    _obj: any,
    params: { calendarId: string; text: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).quickAddEvent(
      String(context.user._id),
      params.calendarId,
      params.text,
    );
  }
}

export default CalendarResolver;
