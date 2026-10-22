import { GOOGLE_MACROS, GOOGLE_TOOLS } from '../ai/macros';

describe('reactory-google AI Macros', () => {
  it('exports all 11 macros conforming to the reactor macro contract', () => {
    expect(GOOGLE_MACROS).toHaveLength(11);

    const macroNames = GOOGLE_MACROS.map((m) => m.name);
    expect(macroNames).toEqual(
      expect.arrayContaining([
        'GetConnectionStatus',
        'GetAuthUrl',
        'SendEmail',
        'SearchEmail',
        'CreateCalendarEvent',
        'ListCalendarEvents',
        'SearchDrive',
        'ReadSpreadsheet',
        'CreateGoogleDoc',
        'ListContacts',
        'CreateTask',
      ]),
    );

    GOOGLE_MACROS.forEach((macro) => {
      expect(macro.nameSpace).toBe('google');
      expect(macro.version).toBe('1.0.0');
      expect(macro.name).toBeDefined();
      expect(macro.description).toBeDefined();
      expect(Array.isArray(macro.tags)).toBe(true);
      // The reactor registry requires a `component` function (not a legacy `handler`).
      expect(typeof (macro as any).component).toBe('function');
      expect(Array.isArray(macro.tools)).toBe(true);
      expect((macro.tools as any[]).length).toBeGreaterThan(0);
      (macro.tools as any[]).forEach((tool) => {
        expect(tool.type).toBe('function');
        expect(tool.function.name).toBeTruthy();
        expect(tool.function.parameters).toBeDefined();
      });
    });
  });

  it('flattens exactly one tool per macro into GOOGLE_TOOLS', () => {
    expect(GOOGLE_TOOLS).toHaveLength(11);
    expect(GOOGLE_TOOLS.map((t) => t.function.name)).toEqual(
      GOOGLE_MACROS.map((m) => m.name),
    );
  });

  describe('Macro components', () => {
    let state: any;

    let mockAuthService: any;
    let mockGmailService: any;
    let mockCalendarService: any;
    let mockDriveService: any;
    let mockSheetsService: any;
    let mockDocsService: any;
    let mockContactsService: any;
    let mockTasksService: any;

    const find = (name: string): any => GOOGLE_MACROS.find((m) => m.name === name);

    beforeEach(() => {
      mockAuthService = {
        getConnectionStatus: jest.fn().mockResolvedValue({ status: 'connected' }),
        getAuthorizationUrl: jest.fn().mockResolvedValue('https://accounts.google.com/o/oauth2/v2/auth?state=abc'),
      };
      mockGmailService = {
        sendMessage: jest.fn().mockResolvedValue({ id: 'msg123' }),
        listMessages: jest.fn().mockResolvedValue({ messages: [] }),
      };
      mockCalendarService = {
        createEvent: jest.fn().mockResolvedValue({ id: 'evt123' }),
        listEvents: jest.fn().mockResolvedValue({ events: [] }),
      };
      mockDriveService = { searchFiles: jest.fn().mockResolvedValue({ files: [] }) };
      mockSheetsService = { getValues: jest.fn().mockResolvedValue({ values: [['A1']] }) };
      mockDocsService = { createDocument: jest.fn().mockResolvedValue({ documentId: 'doc123' }) };
      mockContactsService = {
        searchContacts: jest.fn().mockResolvedValue({ contacts: [] }),
        listContacts: jest.fn().mockResolvedValue({ contacts: [] }),
      };
      mockTasksService = { createTask: jest.fn().mockResolvedValue({ id: 'task123' }) };

      state = {
        context: {
          user: { _id: 'user123' },
          getService: jest.fn((id: string) => {
            if (id === 'google.GoogleAuthService@1.0.0') return mockAuthService;
            if (id === 'google.GmailService@1.0.0') return mockGmailService;
            if (id === 'google.CalendarService@1.0.0') return mockCalendarService;
            if (id === 'google.DriveService@1.0.0') return mockDriveService;
            if (id === 'google.SheetsService@1.0.0') return mockSheetsService;
            if (id === 'google.DocsService@1.0.0') return mockDocsService;
            if (id === 'google.ContactsService@1.0.0') return mockContactsService;
            if (id === 'google.TasksService@1.0.0') return mockTasksService;
            return null;
          }),
        },
      };
    });

    it('GetConnectionStatus invokes authService.getConnectionStatus', async () => {
      const result = await find('GetConnectionStatus').component({}, state);
      expect(mockAuthService.getConnectionStatus).toHaveBeenCalledWith('user123');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ status: 'connected' });
    });

    it('GetAuthUrl mints a consent URL for the current user', async () => {
      const result = await find('GetAuthUrl').component({ services: ['gmail'] }, state);
      expect(mockAuthService.getAuthorizationUrl).toHaveBeenCalledWith('user123', ['gmail']);
      expect(result.success).toBe(true);
      expect(result.data.url).toBe('https://accounts.google.com/o/oauth2/v2/auth?state=abc');
    });

    it('GetAuthUrl defaults to an empty service list (module default scopes)', async () => {
      await find('GetAuthUrl').component({}, state);
      expect(mockAuthService.getAuthorizationUrl).toHaveBeenCalledWith('user123', []);
    });

    it('GetAuthUrl refuses to mint a URL without an authenticated user', async () => {
      const anonState: any = {
        context: { user: undefined, getService: jest.fn(() => mockAuthService) },
      };
      const result = await find('GetAuthUrl').component({}, anonState);
      expect(result.success).toBe(false);
      expect(mockAuthService.getAuthorizationUrl).not.toHaveBeenCalled();
    });

    it('SendEmail invokes gmailService.sendMessage', async () => {
      const params = { to: ['test@example.com'], subject: 'Hi', body: 'Hello' };
      const result = await find('SendEmail').component(params, state);
      expect(mockGmailService.sendMessage).toHaveBeenCalledWith('user123', params);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 'msg123' });
    });

    it('CreateCalendarEvent invokes calendarService.createEvent on the primary calendar', async () => {
      const params = {
        summary: 'Meeting',
        startDateTime: '2026-09-01T10:00:00Z',
        endDateTime: '2026-09-01T11:00:00Z',
      };
      const result = await find('CreateCalendarEvent').component(params, state);
      expect(mockCalendarService.createEvent).toHaveBeenCalledWith('user123', 'primary', params);
      expect(result.data).toEqual({ id: 'evt123' });
    });

    it('CreateTask invokes tasksService.createTask on the default task list', async () => {
      const result = await find('CreateTask').component({ title: 'Review PR' }, state);
      expect(mockTasksService.createTask).toHaveBeenCalledWith('user123', '@default', {
        title: 'Review PR',
      });
      expect(result.data).toEqual({ id: 'task123' });
    });

    it('returns a structured failure when the service is not available', async () => {
      const emptyState: any = {
        context: { user: { _id: 'user123' }, getService: jest.fn().mockReturnValue(null) },
      };
      const result = await find('GetConnectionStatus').component({}, emptyState);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Google Auth Service not available');
    });
  });
});
