import Reactory from '@reactorynet/reactory-core';
import { service } from '@reactory/server-core/application/decorators/service';
import logger from '@reactory/server-core/logging';
import { GoogleAuditLog } from '../models/GoogleAuditLog';

/**
 * Google Audit Service
 *
 * Thin wrapper around the core ReactoryAuditService that writes to the
 * GoogleAuditLog model and delegates to the central audit trail.
 */
@service({
  id: 'google.GoogleAuditService@1.0.0',
  name: 'GoogleAuditService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google-specific audit logging service',
  serviceType: 'logging',
  lifeCycle: 'singleton',
  dependencies: [
    { id: 'core.ReactoryAuditService@1.0.0', alias: 'auditService' },
  ],
})
class GoogleAuditService implements Reactory.Service.IReactoryService {
  name: string = 'GoogleAuditService';
  nameSpace: string = 'google';
  version: string = '1.0.0';
  context: Reactory.Server.IReactoryContext;

  constructor(
    _props: Reactory.Service.IReactoryServiceProps,
    context: Reactory.Server.IReactoryContext
  ) {
    this.context = context;
  }

  private get auditService(): any {
    return this.context.getService('core.ReactoryAuditService@1.0.0');
  }

  /**
   * Log a Google API call with timing and status information.
   */
  async logApiCall(
    googleService: string,
    method: string,
    userId: string,
    requestSummary?: any,
    responseSummary?: any,
    statusCode?: number,
    latencyMs?: number
  ): Promise<void> {
    try {
      const log = new GoogleAuditLog({
        userId,
        service: googleService,
        method,
        statusCode,
        latencyMs,
        requestSummary,
        responseSummary,
        timestamp: new Date(),
      });
      await log.save();

      if (this.auditService) {
        await this.auditService.logAuditEvent?.({
          actorType: 'user',
          actorId: userId,
          action: `google.${googleService}.${method}`,
          resourceType: googleService,
          eventType: 'read',
          outcome: statusCode && statusCode >= 400 ? 'failure' : 'success',
          details: { statusCode, latencyMs, requestSummary },
          moduleName: 'reactory-google',
          moduleVersion: '1.0.0',
        });
      }
    } catch (err) {
      logger.error('GoogleAuditService.logApiCall error:', err);
    }
  }

  /**
   * Log an authentication event (connect, disconnect, refresh, revoke).
   */
  async logAuthEvent(userId: string, action: string, details?: any): Promise<void> {
    try {
      const log = new GoogleAuditLog({
        userId,
        service: 'auth',
        method: action,
        requestSummary: details,
        timestamp: new Date(),
      });
      await log.save();

      if (this.auditService) {
        await this.auditService.logAuditEvent?.({
          actorType: 'user',
          actorId: userId,
          action: `google.auth.${action}`,
          resourceType: 'google_token',
          eventType: action.includes('connect') ? 'create' : 'update',
          outcome: 'success',
          details,
          moduleName: 'reactory-google',
          moduleVersion: '1.0.0',
        });
      }
    } catch (err) {
      logger.error('GoogleAuditService.logAuthEvent error:', err);
    }
  }

  /**
   * Log a webhook/push notification event.
   */
  async logWebhookEvent(googleService: string, payload?: any): Promise<void> {
    try {
      const userId = payload?.userId || 'unknown';
      const log = new GoogleAuditLog({
        userId,
        service: googleService,
        method: 'webhook',
        requestSummary: payload,
        timestamp: new Date(),
      });
      await log.save();
    } catch (err) {
      logger.error('GoogleAuditService.logWebhookEvent error:', err);
    }
  }

  /**
   * Get an API usage report for a user within a date range.
   */
  async getApiUsageReport(
    userId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<any> {
    const query: any = { userId };
    if (dateRange) {
      query.timestamp = { $gte: dateRange.from, $lte: dateRange.to };
    }

    const logs = await GoogleAuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(1000)
      .lean();

    const byService: Record<string, number> = {};
    for (const log of logs) {
      byService[log.service] = (byService[log.service] || 0) + 1;
    }

    return {
      totalCalls: logs.length,
      byService,
      dateRange,
    };
  }
}

export const GoogleAuditServiceDefinition: Reactory.Service.IReactoryServiceDefinition<GoogleAuditService> = {
  service: (props: any, context: any) => new GoogleAuditService(props, context),
  id: 'google.GoogleAuditService@1.0.0',
  name: 'GoogleAuditService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google-specific audit logging service',
  serviceType: 'logging',
  dependencies: [
    { id: 'core.ReactoryAuditService@1.0.0', alias: 'auditService' },
  ],
};

export { GoogleAuditService };
