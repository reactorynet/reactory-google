import express from 'express';
import authRoutes from './auth';
import webhookRoutes from './webhooks';
import proxyRoutes from './proxy';

const router = express.Router();
router.use('/google/auth', authRoutes);
router.use('/google/webhooks', webhookRoutes);
router.use('/google', proxyRoutes);

export default router;
