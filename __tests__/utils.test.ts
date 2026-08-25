import {
  encryptToken,
  decryptToken,
  generateEncryptionSalt,
} from '../utils/token-encryption';
import {
  GOOGLE_SCOPES,
  getDefaultScopes,
  getScopesForServices,
  hasRequiredScopes,
  getMissingScopes,
} from '../utils/scope-helpers';
import { GoogleRateLimiter } from '../utils/rate-limiter';
import { mapGoogleApiError } from '../utils/error-mapper';

describe('reactory-google utils', () => {
  describe('token-encryption', () => {
    const masterKey = 'test-master-encryption-key-32-chars-long!';

    it('should generate a valid base64 salt', () => {
      const salt = generateEncryptionSalt();
      expect(typeof salt).toBe('string');
      expect(salt.length).toBeGreaterThan(10);
    });

    it('should encrypt and decrypt a plaintext token successfully', () => {
      const plaintext = 'ya29.a0AfH6SMD-test-access-token-123456789';
      const salt = generateEncryptionSalt();

      const ciphertext = encryptToken(plaintext, masterKey, salt);
      expect(ciphertext).toBeDefined();
      expect(ciphertext).toContain(':');
      expect(ciphertext.split(':')).toHaveLength(3);

      const decrypted = decryptToken(ciphertext, masterKey, salt);
      expect(decrypted).toBe(plaintext);
    });

    it('should fail decryption if wrong master key is used', () => {
      const plaintext = 'secret-token';
      const salt = generateEncryptionSalt();
      const ciphertext = encryptToken(plaintext, masterKey, salt);

      expect(() => {
        decryptToken(ciphertext, 'wrong-master-key-that-is-different!', salt);
      }).toThrow();
    });

    it('should fail decryption if wrong salt is used', () => {
      const plaintext = 'secret-token';
      const salt1 = generateEncryptionSalt();
      const salt2 = generateEncryptionSalt();
      const ciphertext = encryptToken(plaintext, masterKey, salt1);

      expect(() => {
        decryptToken(ciphertext, masterKey, salt2);
      }).toThrow();
    });

    it('should throw error for invalid ciphertext format', () => {
      expect(() => {
        decryptToken('invalid-ciphertext-without-parts', masterKey, 'salt');
      }).toThrow('Invalid encrypted token format');
    });
  });

  describe('scope-helpers', () => {
    it('should return default profile scopes', () => {
      const defaultScopes = getDefaultScopes();
      expect(defaultScopes).toContain('https://www.googleapis.com/auth/userinfo.profile');
      expect(defaultScopes).toContain('https://www.googleapis.com/auth/userinfo.email');
    });

    it('should combine scopes for requested services', () => {
      const scopes = getScopesForServices(['gmail_send', 'calendar']);
      expect(scopes).toContain('https://www.googleapis.com/auth/userinfo.profile');
      expect(scopes).toContain('https://www.googleapis.com/auth/gmail.send');
      expect(scopes).toContain('https://www.googleapis.com/auth/calendar');
    });

    it('should correctly check if required scopes are granted', () => {
      const granted = [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/gmail.send',
      ];
      const required = ['https://www.googleapis.com/auth/gmail.send'];
      expect(hasRequiredScopes(granted, required)).toBe(true);

      const missing = ['https://www.googleapis.com/auth/calendar'];
      expect(hasRequiredScopes(granted, missing)).toBe(false);
    });

    it('should return missing scopes', () => {
      const granted = ['https://www.googleapis.com/auth/userinfo.profile'];
      const required = [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/drive',
      ];
      const missing = getMissingScopes(granted, required);
      expect(missing).toEqual(['https://www.googleapis.com/auth/drive']);
    });
  });

  describe('rate-limiter', () => {
    it('should allow requests under the limit and decrement remaining count', async () => {
      const mockRedis: any = {
        store: new Map<string, string>(),
        async get(key: string) {
          return this.store.get(key) || null;
        },
        async set(key: string, value: string) {
          this.store.set(key, value);
        },
      };

      const limiter = new GoogleRateLimiter(mockRedis);
      const res1 = await limiter.checkAndIncrement('user1', 'gmail', 5, 60);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(4);

      const usage = await limiter.getUsage('user1', 'gmail');
      expect(usage).toBe(1);
    });

    it('should block requests when limit is exceeded', async () => {
      const mockRedis: any = {
        async get() {
          return '10';
        },
        async set() {},
      };

      const limiter = new GoogleRateLimiter(mockRedis);
      const res = await limiter.checkAndIncrement('user1', 'gmail', 10, 60);
      expect(res.allowed).toBe(false);
      expect(res.remaining).toBe(0);
    });
  });

  describe('error-mapper', () => {
    it('should map 401 to GOOGLE_AUTH_ERROR', () => {
      const err = mapGoogleApiError({ code: 401, message: 'Invalid credentials' }) as any;
      expect(err.code).toBe('GOOGLE_AUTH_ERROR');
      expect(err.httpStatus).toBe(401);
      expect(err.triggerRefresh).toBe(true);
    });

    it('should map 403 to GOOGLE_FORBIDDEN', () => {
      const err = mapGoogleApiError({ status: 403, message: 'Forbidden' }) as any;
      expect(err.code).toBe('GOOGLE_FORBIDDEN');
      expect(err.httpStatus).toBe(403);
    });

    it('should map 429 to GOOGLE_RATE_LIMITED', () => {
      const err = mapGoogleApiError({ response: { status: 429 }, message: 'Quota exceeded' }) as any;
      expect(err.code).toBe('GOOGLE_RATE_LIMITED');
      expect(err.httpStatus).toBe(429);
      expect(err.triggerBackoff).toBe(true);
    });

    it('should handle null/unknown errors gracefully', () => {
      const err = mapGoogleApiError(null) as any;
      expect(err.message).toBe('Unknown Google API error');
    });
  });
});
