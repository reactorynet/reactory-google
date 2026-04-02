/**
 * Core Google types shared across all services
 */

export enum GoogleConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  AUTHORIZING = 'AUTHORIZING',
  CONNECTED = 'CONNECTED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  REVOKED = 'REVOKED',
  PARTIAL_ACCESS = 'PARTIAL_ACCESS',
}

export interface IGoogleToken {
  userId: any;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  accessTokenExpiry: Date;
  grantedScopes: string[];
  googleEmail: string;
  googleUserId: string;
  encryptionSalt: string;
  connectedAt: Date;
  lastRefreshedAt?: Date;
  revokedAt?: Date;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IGoogleSyncState {
  userId: any;
  service: 'gmail' | 'calendar' | 'drive' | 'contacts' | 'tasks';
  resourceId?: string;
  syncToken?: string;
  historyId?: string;
  lastSyncAt?: Date;
  status: 'idle' | 'syncing' | 'error';
  syncMetadata?: any;
}

export interface IGoogleWebhookChannel {
  userId: any;
  channelId: string;
  resourceId: string;
  service: 'gmail' | 'calendar';
  resourceType?: string;
  expiration: Date;
  token: string;
  active: boolean;
}

export interface IGoogleModuleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tokenEncryptionKey: string;
  pubSubProjectId?: string;
  pubSubTopicName?: string;
  pubSubVerificationToken?: string;
  authSuccessRedirect?: string;
  authFailureRedirect?: string;
  defaultScopes?: string[];
  enableWebhooks?: boolean;
  cacheEnabled?: boolean;
}

export interface IGoogleConnection {
  userId: string;
  googleEmail?: string;
  status: GoogleConnectionStatus;
  grantedScopes: string[];
  connectedAt?: Date;
  lastRefreshedAt?: Date;
}

export type GoogleCacheKeyPrefix = 'google';
