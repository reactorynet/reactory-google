import Reactory from '@reactorynet/reactory-core';
import GoogleToken from './GoogleToken';
import GoogleSyncState from './GoogleSyncState';
import GoogleWebhookChannel from './GoogleWebhookChannel';
import GoogleAuditLog from './GoogleAuditLog';

export { GoogleToken, GoogleSyncState, GoogleWebhookChannel, GoogleAuditLog };

export type { IGoogleToken, IGoogleTokenDocument } from './GoogleToken';
export type { IGoogleSyncState, IGoogleSyncStateDocument } from './GoogleSyncState';
export type { IGoogleWebhookChannel, IGoogleWebhookChannelDocument } from './GoogleWebhookChannel';
export type { IGoogleAuditLog, IGoogleAuditLogDocument } from './GoogleAuditLog';

export const ModelDefinitions: Reactory.IReactoryComponentDefinition<any>[] = [
  {
    nameSpace: 'google',
    name: 'GoogleToken',
    version: '1.0.0',
    description: 'Google OAuth Token Storage Model',
    stem: 'google-token',
    tags: ['google', 'oauth', 'token'],
    component: GoogleToken,
    domain: Reactory.ComponentDomain.model,
    overwrite: false,
    roles: [],
  },
  {
    nameSpace: 'google',
    name: 'GoogleSyncState',
    version: '1.0.0',
    description: 'Google Sync State Tracking Model',
    stem: 'google-sync-state',
    tags: ['google', 'sync', 'state'],
    component: GoogleSyncState,
    domain: Reactory.ComponentDomain.model,
    overwrite: false,
    roles: [],
  },
  {
    nameSpace: 'google',
    name: 'GoogleWebhookChannel',
    version: '1.0.0',
    description: 'Google Webhook / Push Notification Channel Model',
    stem: 'google-webhook-channel',
    tags: ['google', 'webhook', 'pubsub'],
    component: GoogleWebhookChannel,
    domain: Reactory.ComponentDomain.model,
    overwrite: false,
    roles: [],
  },
  {
    nameSpace: 'google',
    name: 'GoogleAuditLog',
    version: '1.0.0',
    description: 'Google API Audit Log Model',
    stem: 'google-audit-log',
    tags: ['google', 'audit', 'log'],
    component: GoogleAuditLog,
    domain: Reactory.ComponentDomain.model,
    overwrite: false,
    roles: [],
  },
];

export default ModelDefinitions;
