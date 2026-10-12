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
import {
  htmlToText,
  decodeHtmlEntities,
  stripHtml,
  bestEffortTextBody,
} from '../utils/html';
import { toGraphQLEnum, toGraphQLEnums } from '../utils/graphql-enums';

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

  describe('html-to-text', () => {
    // preferPackage:false pins the built-in converter so output is deterministic
    // whether or not the optional html-to-text package is installed.
    const toText = (html: string) => htmlToText(html, { preferPackage: false });

    it('strips markup and keeps text, converting block boundaries to newlines', () => {
      const out = toText('<p>Hello <b>World</b></p><br/>Bye');
      expect(out).toContain('Hello World');
      expect(out).toContain('Bye');
      expect(out).not.toContain('<');
    });

    it('removes script, style and comments entirely', () => {
      const out = toText('<style>.a{color:red}</style><script>alert(1)</script><!-- x --><div>Content</div>');
      expect(out).toBe('Content');
    });

    it('renders links as text followed by the href', () => {
      const out = toText('<a href="https://example.com/path">Click here</a>');
      expect(out).toContain('Click here');
      expect(out).toContain('https://example.com/path');
    });

    it('decodes named and numeric HTML entities', () => {
      expect(decodeHtmlEntities('Tom &amp; Jerry')).toBe('Tom & Jerry');
      expect(decodeHtmlEntities('&lt;tag&gt;')).toBe('<tag>');
      expect(decodeHtmlEntities('&#39;quoted&#x27;')).toBe("'quoted'");
      expect(decodeHtmlEntities('a&nbsp;b')).toBe('a b');
    });

    it('collapses runaway whitespace', () => {
      const out = toText('<div>   spaced    out   </div>\n\n\n\n<div>next</div>');
      expect(out).toBe('spaced out\n\nnext');
    });

    it('stripHtml is a pre-pass that removes script/style/comment blocks', () => {
      const out = stripHtml('<script>bad()</script><p>ok</p>');
      expect(out).not.toContain('bad()');
      expect(out).toContain('<p>ok</p>');
    });

    it('bestEffortTextBody prefers text/plain and converts HTML when only HTML exists', () => {
      expect(bestEffortTextBody('plain body', '<p>html</p>')).toBe('plain body');
      const fromHtml = bestEffortTextBody(undefined, '<p>Only <b>HTML</b></p>');
      expect(fromHtml).toContain('Only HTML');
      expect(fromHtml).not.toContain('<');
      expect(bestEffortTextBody(undefined, undefined)).toBeUndefined();
    });

    it('returns non-HTML input unchanged (normalised)', () => {
      expect(toText('just   text\n\n\n\nmore')).toBe('just text\n\nmore');
      expect(toText('')).toBe('');
    });
  });

  describe('graphql-enums', () => {
    it('normalises Google enum values to the UPPER_SNAKE spelling', () => {
      expect(toGraphQLEnum('confirmed')).toBe('CONFIRMED');
      expect(toGraphQLEnum('tentative')).toBe('TENTATIVE');
      expect(toGraphQLEnum('cancelled')).toBe('CANCELLED');
      expect(toGraphQLEnum('needsAction')).toBe('NEEDS_ACTION');
      expect(toGraphQLEnum('completed')).toBe('COMPLETED');
      expect(toGraphQLEnum('NEEDS_ACTION')).toBe('NEEDS_ACTION');
    });

    it('returns null for empty input (so nullable fields are omitted, not errored)', () => {
      expect(toGraphQLEnum(null)).toBeNull();
      expect(toGraphQLEnum(undefined)).toBeNull();
      expect(toGraphQLEnum('')).toBeNull();
    });

    it('maps lists', () => {
      expect(toGraphQLEnums(['confirmed', 'tentative'])).toEqual(['CONFIRMED', 'TENTATIVE']);
      expect(toGraphQLEnums(undefined)).toBeUndefined();
    });
  });
});
