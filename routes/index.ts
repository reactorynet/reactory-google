import express from 'express';
import authRoutes from './auth';
import webhookRoutes from './webhooks';
import proxyRoutes from './proxy';

const router = express.Router();

// The module is mounted by the server at the `/google` route key (see index.ts).
// Inner paths are therefore relative to that prefix so the public paths are:
//   /google/auth/url          /google/auth/callback
//   /google/webhooks/pubsub
//   /google/attachment        /google/drive/download|export|thumbnail
router.use('/auth', authRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/', proxyRoutes);

export default router;
