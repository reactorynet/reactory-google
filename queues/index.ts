/**
 * Google Module Queue Handlers
 *
 * Queue job types for background processing of Google Workspace operations.
 * These handlers integrate with the Reactory Queue module (reactory-queue).
 */

/**
 * TokenRefreshQueue: Refreshes expiring OAuth tokens for all connected users.
 * Job payload: { userId: string }
 */
export const TOKEN_REFRESH_QUEUE = 'google.token.refresh';

/**
 * GmailSyncQueue: Syncs new Gmail messages since the last historyId.
 * Job payload: { userId: string; historyId?: string }
 */
export const GMAIL_SYNC_QUEUE = 'google.gmail.sync';

/**
 * CalendarSyncQueue: Syncs calendar events within a rolling window.
 * Job payload: { userId: string; calendarId?: string; days?: number }
 */
export const CALENDAR_SYNC_QUEUE = 'google.calendar.sync';

/**
 * DriveSyncQueue: Syncs Drive file metadata for a folder.
 * Job payload: { userId: string; folderId?: string }
 */
export const DRIVE_SYNC_QUEUE = 'google.drive.sync';

/**
 * BatchOperationQueue: Executes bulk Gmail/Calendar/Drive operations.
 * Job payload: { userId: string; operation: string; items: any[] }
 */
export const BATCH_OPERATION_QUEUE = 'google.batch.operation';

const queues = {
  TOKEN_REFRESH_QUEUE,
  GMAIL_SYNC_QUEUE,
  CALENDAR_SYNC_QUEUE,
  DRIVE_SYNC_QUEUE,
  BATCH_OPERATION_QUEUE,
};

export default queues;

