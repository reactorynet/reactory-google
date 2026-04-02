import Reactory from '@reactorynet/reactory-core';
import { service } from '@reactory/server-core/application/decorators/service';
import logger from '@reactory/server-core/logging';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { GoogleToken } from '../models/GoogleToken';
import { GoogleWebhookChannel } from '../models/GoogleWebhookChannel';
import {
  GoogleConnectionStatus,
  IGoogleConnection,
} from '../types/google.types';
import {
  encryptToken,
  decryptToken,
  generateEncryptionSalt,
} from '../utils/token-encryption';
import { getDefaultScopes, getScopesForServices } from '../utils/scope-helpers';

const AUTH_CACHE_TTL_SECONDS = 300; // 5 minutes
const STATE_CACHE_TTL_SECONDS = 600; // 10 minutes

/**
 * Google OAuth 2.0 Authentication and Token Management Service
 */
@service({
  id: 'google.GoogleAuthService@1.0.0',
  name: 'GoogleAuthService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google OAuth 2.0 authentication and token management',
  serviceType: 'authentication',
  lifeCycle: 'singleton',
  dependencies: [
    { id: 'core.UserService@1.0.0', alias: 'userService' },
    { id: 'core.RedisService@1.0.0', alias: 'redisService' },
  ],
})
class GoogleAuthService implements Reactory.Service.IReactoryService {
  name: string = 'GoogleAuthService';
  nameSpace: string = 'google';
  version: string = '1.0.0';
  context: Reactory.Server.IReactoryContext;

  private oauth2Client: OAuth2Client;

  constructor(
    _props: Reactory.Service.IReactoryServiceProps,
    context: Reactory.Server.IReactoryContext
  ) {
    this.context = context;
    this.oauth2Client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });
  }

  private get redisService(): any {
    return this.context.getService('core.RedisService@1.0.0');
  }

  private get userService(): any {
    return this.context.getService('core.UserService@1.0.0');
  }

  private get auditService(): any {
    return this.context.getService('google.GoogleAuditService@1.0.0');
  }

  private get encryptionKey(): string {
    const key = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
    if (!key) {
      throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY environment variable is not set');
    }
    return key;
  }

  private stateCacheKey(state: string): string {
    return `google:oauth:state:${state}`;
  }

  private tokenCacheKey(userId: string): string {
    return `google:token:${userId}`;
  }

  /**
   * Generate a Google OAuth authorization URL for the given user and scopes.
   */
  async getAuthorizationUrl(userId: string, services: string[] = []): Promise<string> {
    const scopes = services.length > 0
      ? getScopesForServices(services)
      : getDefaultScopes();

    const nonce = crypto.randomBytes(16).toString('hex');
    const stateData = JSON.stringify({ userId, scopes, nonce });
    const stateKey = crypto.createHash('sha256').update(stateData).digest('hex').substring(0, 32);

    await this.redisService.set(
      this.stateCacheKey(stateKey),
      stateData,
      STATE_CACHE_TTL_SECONDS
    );

    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: stateKey,
      prompt: 'consent',
      include_granted_scopes: true,
    });

    return url;
  }

  /**
   * Handle the OAuth callback, exchange code for tokens, encrypt and store them.
   */
  async handleAuthCallback(code: string, state: string): Promise<any> {
    const stateRaw = await this.redisService.get(this.stateCacheKey(state));
    if (!stateRaw) {
      throw new Error('Invalid or expired OAuth state parameter');
    }

    const stateData = JSON.parse(stateRaw);
    const { userId } = stateData;

    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Google OAuth did not return required tokens');
    }

    const salt = generateEncryptionSalt();
    const key = this.encryptionKey;

    const accessTokenEncrypted = encryptToken(tokens.access_token, key, salt);
    const refreshTokenEncrypted = encryptToken(tokens.refresh_token, key, salt);
    const expiry = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    // Get user info to store Google email
    this.oauth2Client.setCredentials(tokens);
    let googleEmail = '';
    let googleUserId = '';
    try {
      const { google } = await import('googleapis');
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      googleEmail = userInfo.data.email || '';
      googleUserId = userInfo.data.id || '';
    } catch (err) {
      logger.warn('Could not fetch Google user info during auth callback:', err);
    }

    const tokenRecord = await GoogleToken.findOneAndUpdate(
      { userId },
      {
        userId,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        accessTokenExpiry: expiry,
        grantedScopes: tokens.scope ? tokens.scope.split(' ') : stateData.scopes,
        googleEmail,
        googleUserId,
        encryptionSalt: salt,
        connectedAt: new Date(),
        lastRefreshedAt: new Date(),
        revokedAt: undefined,
      },
      { upsert: true, new: true }
    );

    // Delete state from cache
    await this.redisService.del(this.stateCacheKey(state)).catch(() => {});

    await this.auditService?.logAuthEvent(userId, 'connect', { googleEmail });

    return tokenRecord;
  }

  /**
   * Refresh the access token for a user.
   */
  async refreshAccessToken(userId: string): Promise<any> {
    const tokenRecord = await GoogleToken.findOne({ userId });
    if (!tokenRecord) {
      throw new Error(`No Google token found for user ${userId}`);
    }

    const key = this.encryptionKey;
    const refreshToken = decryptToken(
      tokenRecord.refreshTokenEncrypted,
      key,
      tokenRecord.encryptionSalt
    );

    const client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });
    client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('Token refresh did not return a new access token');
    }

    const newEncrypted = encryptToken(credentials.access_token, key, tokenRecord.encryptionSalt);
    const newExpiry = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    tokenRecord.accessTokenEncrypted = newEncrypted;
    tokenRecord.accessTokenExpiry = newExpiry;
    tokenRecord.lastRefreshedAt = new Date();
    await tokenRecord.save();

    // Update Redis cache
    const cacheKey = this.tokenCacheKey(String(userId));
    const ttlMs = newExpiry.getTime() - Date.now() - 60000; // 1 min buffer
    if (ttlMs > 0) {
      await this.redisService
        .set(cacheKey, JSON.stringify({ accessToken: credentials.access_token, expiresAt: newExpiry }), Math.floor(ttlMs / 1000))
        .catch(() => {});
    }

    await this.auditService?.logAuthEvent(String(userId), 'refresh', {});

    return tokenRecord;
  }

  /**
   * Get a valid (and decrypted) access token for a user.
   * Checks Redis cache first, then DB, and refreshes if expired.
   */
  async getToken(userId: string): Promise<{ accessToken: string; expiresAt: Date }> {
    const cacheKey = this.tokenCacheKey(userId);

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.accessToken && new Date(parsed.expiresAt) > new Date()) {
          return { accessToken: parsed.accessToken, expiresAt: new Date(parsed.expiresAt) };
        }
      }
    } catch {
      // Cache miss or parse error — fall through to DB
    }

    const tokenRecord = await GoogleToken.findOne({ userId });
    if (!tokenRecord) {
      throw new Error(`Google account not connected for user ${userId}`);
    }

    const key = this.encryptionKey;
    const now = new Date();
    const bufferMs = 60 * 1000;

    let accessToken: string;
    let expiresAt: Date;

    if (tokenRecord.accessTokenExpiry <= new Date(now.getTime() + bufferMs)) {
      // Token expired or about to expire — refresh
      const updated = await this.refreshAccessToken(userId);
      const freshToken = decryptToken(updated.accessTokenEncrypted, key, updated.encryptionSalt);
      accessToken = freshToken;
      expiresAt = updated.accessTokenExpiry;
    } else {
      accessToken = decryptToken(
        tokenRecord.accessTokenEncrypted,
        key,
        tokenRecord.encryptionSalt
      );
      expiresAt = tokenRecord.accessTokenExpiry;
    }

    // Cache with TTL
    const ttlMs = expiresAt.getTime() - Date.now() - 60000;
    if (ttlMs > 0) {
      await this.redisService
        .set(cacheKey, JSON.stringify({ accessToken, expiresAt }), Math.floor(ttlMs / 1000))
        .catch(() => {});
    }

    return { accessToken, expiresAt };
  }

  /**
   * Check if a user has a valid (non-revoked, non-expired) Google token.
   */
  async hasValidToken(userId: string): Promise<boolean> {
    try {
      const tokenRecord = await GoogleToken.findOne({ userId });
      if (!tokenRecord || tokenRecord.revokedAt) return false;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the list of scopes granted by the user's token.
   */
  async getGrantedScopes(userId: string): Promise<string[]> {
    const tokenRecord = await GoogleToken.findOne({ userId });
    return tokenRecord?.grantedScopes || [];
  }

  /**
   * Get the current connection status for a user.
   */
  async getConnectionStatus(userId: string): Promise<IGoogleConnection> {
    const tokenRecord = await GoogleToken.findOne({ userId });

    if (!tokenRecord) {
      return {
        userId,
        status: GoogleConnectionStatus.DISCONNECTED,
        grantedScopes: [],
      };
    }

    if (tokenRecord.revokedAt) {
      return {
        userId,
        googleEmail: tokenRecord.googleEmail,
        status: GoogleConnectionStatus.REVOKED,
        grantedScopes: tokenRecord.grantedScopes,
        connectedAt: tokenRecord.connectedAt,
      };
    }

    const now = new Date();
    const bufferMs = 60 * 1000;
    if (tokenRecord.accessTokenExpiry <= new Date(now.getTime() + bufferMs)) {
      return {
        userId,
        googleEmail: tokenRecord.googleEmail,
        status: GoogleConnectionStatus.TOKEN_EXPIRED,
        grantedScopes: tokenRecord.grantedScopes,
        connectedAt: tokenRecord.connectedAt,
        lastRefreshedAt: tokenRecord.lastRefreshedAt,
      };
    }

    return {
      userId,
      googleEmail: tokenRecord.googleEmail,
      status: GoogleConnectionStatus.CONNECTED,
      grantedScopes: tokenRecord.grantedScopes,
      connectedAt: tokenRecord.connectedAt,
      lastRefreshedAt: tokenRecord.lastRefreshedAt,
    };
  }

  /**
   * Revoke Google access, remove token from DB and cache.
   */
  async revokeAccess(userId: string): Promise<void> {
    const tokenRecord = await GoogleToken.findOne({ userId });

    if (tokenRecord) {
      try {
        const key = this.encryptionKey;
        const accessToken = decryptToken(
          tokenRecord.accessTokenEncrypted,
          key,
          tokenRecord.encryptionSalt
        );
        const revokeClient = new OAuth2Client();
        await revokeClient.revokeToken(accessToken);
      } catch (err) {
        logger.warn('Failed to revoke token at Google:', err);
      }

      tokenRecord.revokedAt = new Date();
      await tokenRecord.save();
    }

    // Clear Redis cache
    await this.redisService.del(this.tokenCacheKey(userId)).catch(() => {});

    // Deactivate webhook channels
    await GoogleWebhookChannel.updateMany({ userId }, { active: false });

    await this.auditService?.logAuthEvent(userId, 'revoke', {});
  }

  /**
   * Generate a URL to request additional scopes for a connected user.
   */
  async requestAdditionalScopes(userId: string, services: string[]): Promise<string> {
    const existingScopes = await this.getGrantedScopes(userId);
    const requestedScopes = getScopesForServices(services);
    const combinedScopes = Array.from(new Set([...existingScopes, ...requestedScopes]));
    return this.getAuthorizationUrl(userId, combinedScopes);
  }

  /**
   * Return an authenticated OAuth2Client for a user, ready to use with googleapis.
   */
  async getAuthorizedClient(userId: string): Promise<OAuth2Client> {
    const { accessToken, expiresAt } = await this.getToken(userId);
    const client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });
    client.setCredentials({ access_token: accessToken, expiry_date: expiresAt.getTime() });
    return client;
  }
}

export const GoogleAuthServiceDefinition: Reactory.Service.IReactoryServiceDefinition<GoogleAuthService> = {
  service: (props: any, context: any) => new GoogleAuthService(props, context),
  id: 'google.GoogleAuthService@1.0.0',
  name: 'GoogleAuthService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google OAuth 2.0 authentication and token management',
  serviceType: 'authentication',
  dependencies: [
    { id: 'core.UserService@1.0.0', alias: 'userService' },
    { id: 'core.RedisService@1.0.0', alias: 'redisService' },
  ],
};

export { GoogleAuthService };
