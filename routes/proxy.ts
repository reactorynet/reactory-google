import express, { Request, Response } from 'express';
import logger from '@reactory/server-core/logging';

const router = express.Router();

/**
 * GET /api/google/proxy/attachment
 * Download a Gmail attachment.
 * Query params: messageId, attachmentId
 */
router.get('/attachment', async (req: Request, res: Response) => {
  try {
    const context = (req as any).context;
    if (!context?.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { messageId, attachmentId } = req.query;
    if (!messageId || !attachmentId) {
      return res.status(400).json({ error: 'messageId and attachmentId are required' });
    }

    const gmailService = context.getService('google.GmailService@1.0.0');
    if (!gmailService) {
      return res.status(503).json({ error: 'Gmail Service not available' });
    }

    const attachment = await gmailService.getAttachment(
      String(context.user._id),
      String(messageId),
      String(attachmentId),
    );

    if (!attachment?.data) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const buffer = Buffer.from(attachment.data, 'base64');
    const filename = attachment.filename || 'attachment';
    const mimeType = attachment.mimeType || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (err: any) {
    logger.error('Error downloading attachment:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/google/proxy/drive/download
 * Download a Drive file.
 * Query params: fileId
 */
router.get('/drive/download', async (req: Request, res: Response) => {
  try {
    const context = (req as any).context;
    if (!context?.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { fileId } = req.query;
    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    const driveService = context.getService('google.DriveService@1.0.0');
    if (!driveService) {
      return res.status(503).json({ error: 'Drive Service not available' });
    }

    const result = await driveService.downloadFile(
      String(context.user._id),
      String(fileId),
    );

    if (!result) {
      return res.status(404).json({ error: 'File not found or could not be downloaded' });
    }

    res.setHeader('Content-Type', result.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${result.name || fileId}"`);
    return result.stream.pipe(res);
  } catch (err: any) {
    logger.error('Error downloading Drive file:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/google/proxy/drive/export
 * Export a Google Workspace file (Docs, Sheets, Slides) to a specified MIME type.
 * Query params: fileId, mimeType
 */
router.get('/drive/export', async (req: Request, res: Response) => {
  try {
    const context = (req as any).context;
    if (!context?.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { fileId, mimeType } = req.query;
    if (!fileId || !mimeType) {
      return res.status(400).json({ error: 'fileId and mimeType are required' });
    }

    const driveService = context.getService('google.DriveService@1.0.0');
    if (!driveService) {
      return res.status(503).json({ error: 'Drive Service not available' });
    }

    const result = await driveService.exportFile(
      String(context.user._id),
      String(fileId),
      String(mimeType),
    );

    if (!result) {
      return res.status(404).json({ error: 'File not found or could not be exported' });
    }

    res.setHeader('Content-Type', String(mimeType));
    return result.stream.pipe(res);
  } catch (err: any) {
    logger.error('Error exporting Drive file:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/google/proxy/drive/thumbnail
 * Proxy a Drive thumbnail link (avoids CORS issues on the client side).
 * Query params: fileId
 */
router.get('/drive/thumbnail', async (req: Request, res: Response) => {
  try {
    const context = (req as any).context;
    if (!context?.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { fileId } = req.query;
    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    const driveService = context.getService('google.DriveService@1.0.0');
    if (!driveService) {
      return res.status(503).json({ error: 'Drive Service not available' });
    }

    const thumbnailLink = await driveService.generateThumbnailLink(
      String(context.user._id),
      String(fileId),
    );

    if (!thumbnailLink) {
      return res.status(404).json({ error: 'Thumbnail not available' });
    }

    return res.redirect(thumbnailLink);
  } catch (err: any) {
    logger.error('Error getting Drive thumbnail:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
