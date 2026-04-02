import { Request, Response, NextFunction } from 'express';
import logger from '@reactory/server-core/logging';

/**
 * Middleware that checks whether the current user has a valid Google token.
 * Sets `req.googleConnected` to true/false without blocking the request.
 * Use `requireGoogleAuth` when you need to enforce connection.
 */
export async function googleAuthCheck(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const context = (req as any).context;
    (req as any).googleConnected = false;

    if (!context?.user) {
      return next();
    }

    const authService = context.getService('google.GoogleAuthService@1.0.0');
    if (!authService) {
      return next();
    }

    const hasToken = await authService.hasValidToken(String(context.user._id));
    (req as any).googleConnected = hasToken;
  } catch (err) {
    logger.debug('googleAuthCheck error (non-blocking):', err);
  }

  return next();
}

/**
 * Middleware that requires the user to have a valid Google token.
 * Returns 403 if not connected.
 */
export async function requireGoogleAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const context = (req as any).context;
    if (!context?.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const authService = context.getService('google.GoogleAuthService@1.0.0');
    if (!authService) {
      res.status(503).json({ error: 'Google Auth Service not available' });
      return;
    }

    const hasToken = await authService.hasValidToken(String(context.user._id));
    if (!hasToken) {
      res.status(403).json({
        error: 'Google account not connected',
        code: 'GOOGLE_NOT_CONNECTED',
      });
      return;
    }

    (req as any).googleConnected = true;
    return next();
  } catch (err: any) {
    logger.error('requireGoogleAuth error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
