import express, { Request, Response } from 'express';
import logger from '@reactory/server-core/logging';

const router = express.Router();

/**
 * POST /api/google/webhooks/pubsub
 * Receive Google Pub/Sub push notifications for Gmail, Calendar, Drive, etc.
 *
 * Google sends a JSON body: { message: { data: base64, messageId, publishTime }, subscription }
 * The "data" field is base64-encoded JSON for the resource change notification.
 */
router.post('/pubsub', async (req: Request, res: Response) => {
  try {
    // Verify the push token from query param or header
    const verificationToken = process.env.GOOGLE_PUBSUB_VERIFICATION_TOKEN;
    if (verificationToken) {
      const providedToken =
        req.query.token ||
        req.headers['x-goog-channel-token'];

      if (!providedToken || providedToken !== verificationToken) {
        logger.warn('PubSub push rejected: invalid verification token');
        return res.status(403).json({ error: 'Invalid verification token' });
      }
    }

    const body = req.body;
    if (!body?.message) {
      // Return 204: Google will not retry if we return 2xx without processing
      return res.status(204).send();
    }

    const messageData = body.message.data
      ? Buffer.from(body.message.data, 'base64').toString('utf-8')
      : null;

    let parsedData: Record<string, any> | null = null;
    if (messageData) {
      try {
        parsedData = JSON.parse(messageData);
      } catch {
        logger.warn('PubSub message data could not be parsed as JSON');
      }
    }

    // Pass to audit + queue processing asynchronously — respond immediately
    setImmediate(async () => {
      try {
        const context = (req as any).context;
        if (!context) return;

        const auditService = context.getService('google.GoogleAuditService@1.0.0');
        if (auditService && parsedData) {
          await auditService.logWebhookEvent(
            parsedData.emailAddress || 'system',
            parsedData.historyId || '',
            {
              messageId: body.message.messageId,
              publishTime: body.message.publishTime,
              subscription: body.subscription,
              data: parsedData,
            },
          );
        }

        // Trigger sync queue jobs based on resource type
        const googleService = context.getService('google.GoogleService@1.0.0');
        if (googleService && parsedData?.emailAddress) {
          // Emit webhook event so queue consumers can react
          context.pubsub?.publish('GOOGLE_WEBHOOK', {
            googleWebhook: {
              emailAddress: parsedData.emailAddress,
              historyId: parsedData.historyId,
              publishTime: body.message.publishTime,
            },
          });
        }
      } catch (err) {
        logger.error('Error processing PubSub webhook:', err);
      }
    });

    // Acknowledge immediately to prevent re-delivery
    return res.status(204).send();
  } catch (err: any) {
    logger.error('Error handling PubSub webhook:', err);
    // Return 204 to prevent Google retrying for transient internal errors
    return res.status(204).send();
  }
});

/**
 * GET /api/google/webhooks/pubsub
 * Handle Google verification challenge (used by some webhook setups).
 */
router.get('/pubsub', (req: Request, res: Response) => {
  const challenge = req.query['hub.challenge'];
  if (challenge) {
    return res.status(200).send(challenge);
  }
  return res.status(200).json({ status: 'ok' });
});

export default router;
