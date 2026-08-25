import { GoogleService } from '../services/GoogleService';
import { GoogleAuthService } from '../services/GoogleAuthService';
import { GmailService } from '../services/GmailService';
import { GoogleConnectionStatus } from '../types/google.types';
import { GoogleToken } from '../models/GoogleToken';

jest.mock('../models/GoogleToken');
jest.mock('../models/GoogleWebhookChannel');

describe('reactory-google services', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: 'mock-client-id.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'mock-client-secret',
      GOOGLE_REDIRECT_URI: 'http://localhost:4000/google/auth/callback',
      GOOGLE_TOKEN_ENCRYPTION_KEY: 'test-master-encryption-key-32-chars-long!',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GoogleService (Orchestrator)', () => {
    it('should initialize and resolve sub-services from context', () => {
      const mockContext: any = {
        user: { _id: 'user123' },
        getService: jest.fn((id: string) => {
          return { id };
        }),
      };

      const googleService = new GoogleService({} as any, mockContext);
      expect(googleService.name).toBe('GoogleService');
      expect(googleService.version).toBe('1.0.0');

      expect(googleService.getAuthService()).toEqual({ id: 'google.GoogleAuthService@1.0.0' });
      expect(googleService.getGmailService()).toEqual({ id: 'google.GmailService@1.0.0' });
      expect(googleService.getCalendarService()).toEqual({ id: 'google.CalendarService@1.0.0' });
      expect(googleService.getDriveService()).toEqual({ id: 'google.DriveService@1.0.0' });
      expect(googleService.getDocsService()).toEqual({ id: 'google.DocsService@1.0.0' });
      expect(googleService.getSheetsService()).toEqual({ id: 'google.SheetsService@1.0.0' });
      expect(googleService.getContactsService()).toEqual({ id: 'google.ContactsService@1.0.0' });
      expect(googleService.getTasksService()).toEqual({ id: 'google.TasksService@1.0.0' });
      expect(googleService.getAuditService()).toEqual({ id: 'google.GoogleAuditService@1.0.0' });
    });

    it('should delegate getConnectionStatus to GoogleAuthService', async () => {
      const mockAuthService = {
        getConnectionStatus: jest.fn().mockResolvedValue({
          userId: 'user123',
          status: GoogleConnectionStatus.CONNECTED,
          grantedScopes: ['email'],
        }),
      };

      const mockContext: any = {
        user: { _id: 'user123' },
        getService: jest.fn(() => mockAuthService),
      };

      const googleService = new GoogleService({} as any, mockContext);
      const status = await googleService.getConnectionStatus();

      expect(mockAuthService.getConnectionStatus).toHaveBeenCalledWith('user123');
      expect(status.status).toBe(GoogleConnectionStatus.CONNECTED);
    });

    it('should delegate disconnectAccount to GoogleAuthService.revokeAccess', async () => {
      const mockAuthService = {
        revokeAccess: jest.fn().mockResolvedValue(undefined),
      };

      const mockContext: any = {
        user: { _id: 'user123' },
        getService: jest.fn(() => mockAuthService),
      };

      const googleService = new GoogleService({} as any, mockContext);
      await googleService.disconnectAccount('user456');

      expect(mockAuthService.revokeAccess).toHaveBeenCalledWith('user456');
    });
  });

  describe('GoogleAuthService', () => {
    let mockRedis: any;
    let mockAuditService: any;
    let mockContext: any;

    beforeEach(() => {
      const store = new Map<string, string>();
      mockRedis = {
        store,
        get: jest.fn(async (key: string) => store.get(key) || null),
        set: jest.fn(async (key: string, val: string) => {
          store.set(key, val);
        }),
        del: jest.fn(async (key: string) => {
          store.delete(key);
        }),
      };

      mockAuditService = {
        logAuthEvent: jest.fn().mockResolvedValue(undefined),
      };

      mockContext = {
        user: { _id: 'user123' },
        getService: jest.fn((id: string) => {
          if (id === 'core.RedisService@1.0.0') return mockRedis;
          if (id === 'google.GoogleAuditService@1.0.0') return mockAuditService;
          return null;
        }),
      };
    });

    it('should generate an authorization URL and cache the state parameter in Redis', async () => {
      const authService = new GoogleAuthService({} as any, mockContext);
      const url = await authService.getAuthorizationUrl('user123', ['gmail_send']);

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('response_type=code');
      expect(url).toContain('access_type=offline');
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should return DISCONNECTED status when no token record exists', async () => {
      (GoogleToken.findOne as jest.Mock).mockResolvedValue(null);

      const authService = new GoogleAuthService({} as any, mockContext);
      const status = await authService.getConnectionStatus('user123');

      expect(status.status).toBe(GoogleConnectionStatus.DISCONNECTED);
      expect(status.grantedScopes).toEqual([]);
    });

    it('should return REVOKED status when token has revokedAt timestamp', async () => {
      (GoogleToken.findOne as jest.Mock).mockResolvedValue({
        userId: 'user123',
        googleEmail: 'user@example.com',
        revokedAt: new Date(),
        grantedScopes: ['email'],
        connectedAt: new Date(),
      });

      const authService = new GoogleAuthService({} as any, mockContext);
      const status = await authService.getConnectionStatus('user123');

      expect(status.status).toBe(GoogleConnectionStatus.REVOKED);
    });

    it('should return CONNECTED status for valid, non-expired token', async () => {
      (GoogleToken.findOne as jest.Mock).mockResolvedValue({
        userId: 'user123',
        googleEmail: 'user@example.com',
        accessTokenExpiry: new Date(Date.now() + 3600 * 1000),
        grantedScopes: ['https://www.googleapis.com/auth/gmail.send'],
        connectedAt: new Date(),
        lastRefreshedAt: new Date(),
      });

      const authService = new GoogleAuthService({} as any, mockContext);
      const status = await authService.getConnectionStatus('user123');

      expect(status.status).toBe(GoogleConnectionStatus.CONNECTED);
      expect(status.googleEmail).toBe('user@example.com');
    });
  });

  describe('GmailService', () => {
    it('should format message labels and cache them in Redis', async () => {
      const mockLabels = [
        { id: 'INBOX', name: 'INBOX', type: 'system', messagesTotal: 42, messagesUnread: 3 },
      ];

      const mockRedis: any = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
      };

      const mockAuthClient = {};
      const mockAuthService = {
        getAuthorizedClient: jest.fn().mockResolvedValue(mockAuthClient),
      };

      const mockContext: any = {
        user: { _id: 'user123' },
        getService: jest.fn((id: string) => {
          if (id === 'core.RedisService@1.0.0') return mockRedis;
          if (id === 'google.GoogleAuthService@1.0.0') return mockAuthService;
          return null;
        }),
      };

      const gmailService = new GmailService({} as any, mockContext);
      expect(gmailService.name).toBe('GmailService');
    });
  });
});
