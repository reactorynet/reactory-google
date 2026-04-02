import { Request, Response, NextFunction } from 'express';
import logger from '@reactory/server-core/logging';

/**
 * Middleware that verifies incoming Google Pub/Sub webhook push requests.
 *
 * When GOOGLE_PUBSUB_VERIFICATION_TOKEN is set, the token must be present as:
 *   - `?token=xxx` query parameter, OR
 *   - `x-goog-channel-token` request header
 *
 * If the token is missing or does not match, the request is rejected with 403.
 * If no token is configured, the middleware passes through (development mode).
 */
export function webhookVerification(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const verificationToken = process.env.GOOGLE_PUBSUB_VERIFICATION_TOKEN;

  if (!verificationToken) {
    logger.debug(
      'GOOGLE_PUBSUB_VERIFICATION_TOKEN not set — skipping webhook token verification',
    );
    return next();
  }

  const providedToken =
    req.query.token ?? req.headers['x-goog-channel-token'];

  if (!providedToken) {
    logger.warn('Webhook verification failed: no token provided');
    res.status(403).json({ error: 'Missing verification token' });
    return;
  }

  if (providedToken !== verificationToken) {
    logger.warn('Webhook verification failed: token mismatch');
    res.status(403).json({ error: 'Invalid verification token' });
    return;
  }

  return next();
}
