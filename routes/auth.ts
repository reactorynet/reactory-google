import express, { Request, Response } from 'express';
import logger from '@reactory/server-core/logging';

const router = express.Router();

/**
 * GET /api/google/auth/url?scopes=gmail,calendar
 * Generate Google OAuth authorization URL for the current user.
 */
router.get('/url', async (req: Request, res: Response) => {
  try {
    const context = (req as any).context;
    if (!context?.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const authService = context.getService('google.GoogleAuthService@1.0.0');
    if (!authService) {
      return res.status(503).json({ error: 'Google Auth Service not available' });
    }

    const services = req.query.scopes
      ? String(req.query.scopes).split(',').map((s) => s.trim())
      : [];

    const url = await authService.getAuthorizationUrl(String(context.user._id), services);
    return res.json({ url });
  } catch (err: any) {
    logger.error('Error generating Google auth URL:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/google/auth/callback?code=xxx&state=yyy
 * Handle Google OAuth callback.
 */
router.get('/callback', async (req: Request, res: Response) => {
  const successRedirect = process.env.GOOGLE_AUTH_SUCCESS_REDIRECT || '/dashboard?google=connected';
  const failureRedirect = process.env.GOOGLE_AUTH_FAILURE_REDIRECT || '/dashboard?google=error';

  try {
    const context = (req as any).context;
    const authService = context?.getService('google.GoogleAuthService@1.0.0');
    if (!authService) {
      return res.redirect(failureRedirect);
    }

    const { code, state } = req.query;
    if (!code || !state) {
      return res.redirect(failureRedirect + '&reason=missing_params');
    }

    await authService.handleAuthCallback(String(code), String(state));
    return res.redirect(successRedirect);
  } catch (err: any) {
    logger.error('Error handling Google auth callback:', err);
    return res.redirect(`${failureRedirect}&reason=${encodeURIComponent(err.message)}`);
  }
});

/**
 * POST /api/google/auth/disconnect
 * Revoke Google access for the current user.
 */
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const context = (req as any).context;
    if (!context?.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const authService = context.getService('google.GoogleAuthService@1.0.0');
    if (!authService) {
      return res.status(503).json({ error: 'Google Auth Service not available' });
    }

    await authService.revokeAccess(String(context.user._id));
    return res.json({ success: true, message: 'Google account disconnected' });
  } catch (err: any) {
    logger.error('Error disconnecting Google account:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/google/auth/status
 * Get Google connection status for the current user.
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const context = (req as any).context;
    if (!context?.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const authService = context.getService('google.GoogleAuthService@1.0.0');
    if (!authService) {
      return res.status(503).json({ error: 'Google Auth Service not available' });
    }

    const status = await authService.getConnectionStatus(String(context.user._id));
    return res.json(status);
  } catch (err: any) {
    logger.error('Error getting Google auth status:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
