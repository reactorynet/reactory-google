import Reactory from '@reactorynet/reactory-core';

const googleAuthStatusCommand: Reactory.IReactoryCLICommand = {
  id: 'google:auth-status',
  command: 'google:auth-status',
  name: 'Google Auth Status',
  description: 'Show Google connection status for a user',
  args: '<userId>',
  handler: async (args: string[], context: Reactory.Server.IReactoryContext) => {
    const [userId] = args;
    if (!userId) {
      context.log('Usage: google:auth-status <userId>');
      return;
    }
    const authService = context.getService('google.GoogleAuthService@1.0.0') as any;
    if (!authService) {
      context.log('Error: Google Auth Service not available');
      return;
    }
    const status = await authService.getConnectionStatus(userId);
    context.log(JSON.stringify(status, null, 2));
  },
};

const googleListConnectionsCommand: Reactory.IReactoryCLICommand = {
  id: 'google:list-connections',
  command: 'google:list-connections',
  name: 'List Google Connections',
  description: 'List all active Google OAuth connections',
  args: '[--active-only]',
  handler: async (args: string[], context: Reactory.Server.IReactoryContext) => {
    const GoogleToken = context.getModel('google.GoogleToken@1.0.0') as any;
    if (!GoogleToken) {
      context.log('Error: GoogleToken model not available');
      return;
    }
    const activeOnly = args.includes('--active-only');
    const query = activeOnly ? { expiresAt: { $gt: new Date() } } : {};
    const tokens = await GoogleToken.find(query).select('userId email connectedAt expiresAt').lean();
    context.log(`Found ${tokens.length} connection(s):`);
    tokens.forEach((t: any) => {
      context.log(`  - ${t.userId} (${t.email || 'no email'}) expires: ${t.expiresAt}`);
    });
  },
};

const googleSyncGmailCommand: Reactory.IReactoryCLICommand = {
  id: 'google:sync-gmail',
  command: 'google:sync-gmail',
  name: 'Sync Gmail',
  description: 'Trigger a Gmail sync for a user',
  args: '<userId> [--max-results=<n>]',
  handler: async (args: string[], context: Reactory.Server.IReactoryContext) => {
    const [userId] = args;
    if (!userId) {
      context.log('Usage: google:sync-gmail <userId>');
      return;
    }
    const gmailService = context.getService('google.GmailService@1.0.0') as any;
    if (!gmailService) {
      context.log('Error: Gmail Service not available');
      return;
    }
    const maxResultsArg = args.find((a) => a.startsWith('--max-results='));
    const maxResults = maxResultsArg ? parseInt(maxResultsArg.split('=')[1], 10) : 10;
    context.log(`Syncing Gmail for user ${userId}...`);
    const result = await gmailService.listMessages(userId, { maxResults });
    context.log(`Synced ${result?.messages?.length || 0} message(s).`);
  },
};

const googleSyncCalendarCommand: Reactory.IReactoryCLICommand = {
  id: 'google:sync-calendar',
  command: 'google:sync-calendar',
  name: 'Sync Calendar',
  description: 'Trigger a Calendar sync for a user',
  args: '<userId> [--days=<n>]',
  handler: async (args: string[], context: Reactory.Server.IReactoryContext) => {
    const [userId] = args;
    if (!userId) {
      context.log('Usage: google:sync-calendar <userId>');
      return;
    }
    const calendarService = context.getService('google.CalendarService@1.0.0') as any;
    if (!calendarService) {
      context.log('Error: Calendar Service not available');
      return;
    }
    const daysArg = args.find((a) => a.startsWith('--days='));
    const days = daysArg ? parseInt(daysArg.split('=')[1], 10) : 7;
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + days * 86400000).toISOString();
    context.log(`Syncing Calendar for user ${userId} (next ${days} days)...`);
    const result = await calendarService.listEvents(userId, 'primary', { timeMin, timeMax });
    context.log(`Synced ${result?.events?.length || 0} event(s).`);
  },
};

const cliCommands: Reactory.IReactoryCLICommand[] = [
  googleAuthStatusCommand,
  googleListConnectionsCommand,
  googleSyncGmailCommand,
  googleSyncCalendarCommand,
];

export default cliCommands;

