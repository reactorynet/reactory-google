import { GOOGLE_MACROS } from '../ai/macros';

describe('reactory-google AI Macros', () => {
  it('should export all 10 defined macros with required properties', () => {
    expect(GOOGLE_MACROS).toHaveLength(10);

    const macroNames = GOOGLE_MACROS.map((m) => m.name);
    expect(macroNames).toContain('GetConnectionStatus');
    expect(macroNames).toContain('SendEmail');
    expect(macroNames).toContain('SearchEmail');
    expect(macroNames).toContain('CreateCalendarEvent');
    expect(macroNames).toContain('ListCalendarEvents');
    expect(macroNames).toContain('SearchDrive');
    expect(macroNames).toContain('ReadSpreadsheet');
    expect(macroNames).toContain('CreateGoogleDoc');
    expect(macroNames).toContain('ListContacts');
    expect(macroNames).toContain('CreateTask');

    GOOGLE_MACROS.forEach((macro) => {
      expect(macro.id).toBeDefined();
      expect(macro.nameSpace).toBe('google');
      expect(macro.version).toBe('1.0.0');
      expect(macro.description).toBeDefined();
      expect(Array.isArray(macro.tags)).toBe(true);
      expect(typeof macro.handler).toBe('function');
    });
  });

  describe('Macro Handlers', () => {
    let mockContext: any;
    let mockAuthService: any;
    let mockGmailService: any;
    let mockCalendarService: any;
    let mockDriveService: any;
    let mockSheetsService: any;
    let mockDocsService: any;
    let mockContactsService: any;
    let mockTasksService: any;

    beforeEach(() => {
      mockAuthService = {
        getConnectionStatus: jest.fn().mockResolvedValue({ status: 'connected' }),
      };
      mockGmailService = {
        sendMessage: jest.fn().mockResolvedValue({ id: 'msg123' }),
        listMessages: jest.fn().mockResolvedValue({ messages: [] }),
      };
      mockCalendarService = {
        createEvent: jest.fn().mockResolvedValue({ id: 'evt123' }),
        listEvents: jest.fn().mockResolvedValue({ events: [] }),
      };
      mockDriveService = {
        searchFiles: jest.fn().mockResolvedValue({ files: [] }),
      };
      mockSheetsService = {
        getValues: jest.fn().mockResolvedValue({ values: [['A1', 'B1']] }),
      };
      mockDocsService = {
        createDocument: jest.fn().mockResolvedValue({ documentId: 'doc123' }),
      };
      mockContactsService = {
        searchContacts: jest.fn().mockResolvedValue({ contacts: [] }),
        listContacts: jest.fn().mockResolvedValue({ contacts: [] }),
      };
      mockTasksService = {
        createTask: jest.fn().mockResolvedValue({ id: 'task123' }),
      };

      mockContext = {
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
      };
    });

    it('GetConnectionStatus should invoke authService.getConnectionStatus', async () => {
      const macro = GOOGLE_MACROS.find((m) => m.name === 'GetConnectionStatus')!;
      const result = await macro.handler({}, mockContext);
      expect(mockAuthService.getConnectionStatus).toHaveBeenCalledWith('user123');
      expect(result).toEqual({ status: 'connected' });
    });

    it('SendEmail should invoke gmailService.sendMessage', async () => {
      const macro = GOOGLE_MACROS.find((m) => m.name === 'SendEmail')!;
      const params = { to: ['test@example.com'], subject: 'Hi', body: 'Hello' };
      const result = await macro.handler(params, mockContext);
      expect(mockGmailService.sendMessage).toHaveBeenCalledWith('user123', params);
      expect(result).toEqual({ id: 'msg123' });
    });

    it('CreateCalendarEvent should invoke calendarService.createEvent', async () => {
      const macro = GOOGLE_MACROS.find((m) => m.name === 'CreateCalendarEvent')!;
      const params = { summary: 'Meeting', startDateTime: '2026-09-01T10:00:00Z', endDateTime: '2026-09-01T11:00:00Z' };
      const result = await macro.handler(params, mockContext);
      expect(mockCalendarService.createEvent).toHaveBeenCalledWith('user123', 'primary', params);
      expect(result).toEqual({ id: 'evt123' });
    });

    it('CreateTask should invoke tasksService.createTask', async () => {
      const macro = GOOGLE_MACROS.find((m) => m.name === 'CreateTask')!;
      const params = { title: 'Review PR' };
      const result = await macro.handler(params, mockContext);
      expect(mockTasksService.createTask).toHaveBeenCalledWith('user123', '@default', params);
      expect(result).toEqual({ id: 'task123' });
    });

    it('should return error when service is not available', async () => {
      const emptyContext: any = {
        user: { _id: 'user123' },
        getService: jest.fn().mockReturnValue(null),
      };

      const macro = GOOGLE_MACROS.find((m) => m.name === 'GetConnectionStatus')!;
      const result = await macro.handler({}, emptyContext);
      expect(result).toEqual({ error: 'Google Auth Service not available' });
    });
  });
});
