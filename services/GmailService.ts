import Reactory from '@reactorynet/reactory-core';
import { service } from '@reactory/server-core/application/decorators/service';
import logger from '@reactory/server-core/logging';
import { google } from 'googleapis';
import {
  IGmailMessage,
  IGmailThread,
  IGmailLabel,
  IGmailDraft,
  IGmailAttachment,
  IGmailProfile,
  IGmailMessageList,
  IGmailListOptions,
  IGmailGetOptions,
  IGmailSendOptions,
  IEmailAddress,
  GmailBodyFormat,
} from '../types/gmail.types';
import { GoogleWebhookChannel } from '../models/GoogleWebhookChannel';
import { bestEffortTextBody, htmlToText } from '../utils/html';

const LABEL_CACHE_TTL = 300;

/**
 * The caller-facing API of GmailService is **userId-first** (matching
 * GoogleAuthService and the module's resolvers / macros / CLI). When `userId` is
 * omitted the service falls back to the execution context's user, so both call
 * styles work.
 */

function buildRfc2822(
  to: string,
  subject: string,
  body: string,
  options: IGmailSendOptions = {}
): string {
  const lines: string[] = [];
  lines.push(`To: ${to}`);
  if (options.cc?.length) lines.push(`Cc: ${options.cc.join(', ')}`);
  if (options.bcc?.length) lines.push(`Bcc: ${options.bcc.join(', ')}`);
  lines.push(`Subject: ${subject}`);
  if (options.inReplyTo) lines.push(`In-Reply-To: ${options.inReplyTo}`);
  if (options.inReplyTo) lines.push(`References: ${options.inReplyTo}`);
  lines.push(`MIME-Version: 1.0`);
  if (options.isHtml) {
    lines.push(`Content-Type: text/html; charset=UTF-8`);
  } else {
    lines.push(`Content-Type: text/plain; charset=UTF-8`);
  }
  lines.push('');
  lines.push(body);
  return lines.join('\r\n');
}

function encodeBase64Url(str: string): string {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function parseEmailHeader(header: string): IEmailAddress {
  const match = header.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { email: header.trim() };
}

function parseMessageHeaders(headers: Array<{ name?: string; value?: string }>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of headers) {
    if (h.name) map[h.name.toLowerCase()] = h.value || '';
  }
  return map;
}

/** Normalise an address header that may contain several comma-separated addresses. */
function parseAddressList(header: string | undefined): IEmailAddress[] {
  if (!header) return [];
  return String(header)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(parseEmailHeader);
}

interface IExtractedBody {
  plain?: string;
  html?: string;
  attachments: IGmailAttachment[];
}

/**
 * Recursively walk a Gmail payload tree and collect the plain-text body, the HTML
 * body and any attachments. Handles `multipart/alternative`, `multipart/mixed` and
 * arbitrarily nested parts — the previous implementation only read
 * `payload.body.data`, so multipart/HTML mail yielded no body at all.
 */
function extractBody(payload: any): IExtractedBody {
  const acc: IExtractedBody = { attachments: [] };

  const walk = (part: any) => {
    if (!part) return;
    const mime = String(part.mimeType || '').toLowerCase();
    const body = part.body || {};

    if (part.filename && body.attachmentId) {
      acc.attachments.push({
        attachmentId: body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: body.size || 0,
      });
    }

    if (body.data) {
      const decoded = Buffer.from(body.data, 'base64').toString('utf8');
      if (mime === 'text/plain' && acc.plain === undefined) acc.plain = decoded;
      else if (mime === 'text/html' && acc.html === undefined) acc.html = decoded;
    }

    (part.parts || []).forEach(walk);
  };

  walk(payload);
  return acc;
}

@service({
  id: 'google.GmailService@1.0.0',
  name: 'GmailService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Gmail API operations service',
  serviceType: 'messaging',
  lifeCycle: 'singleton',
  dependencies: [
    { id: 'google.GoogleAuthService@1.0.0', alias: 'googleAuthService' },
    { id: 'core.ReactoryFileService@1.0.0', alias: 'fileService' },
    { id: 'core.RedisService@1.0.0', alias: 'redisService' },
  ],
})
class GmailService implements Reactory.Service.IReactoryService {
  name: string = 'GmailService';
  nameSpace: string = 'google';
  version: string = '1.0.0';
  context: Reactory.Server.IReactoryContext;

  constructor(
    _props: Reactory.Service.IReactoryServiceProps,
    context: Reactory.Server.IReactoryContext
  ) {
    this.context = context;
  }

  private get authService(): any {
    return this.context.getService('google.GoogleAuthService@1.0.0');
  }

  private _redisService: any;

  private get redisService(): any {
    return this._redisService || this.context.getService('core.RedisService@1.0.0');
  }

  // Bound by the Reactory service container from the `redisService` dependency alias.
  setRedisService(service: any): void {
    this._redisService = service;
  }

  private get auditService(): any {
    return this.context.getService('google.GoogleAuditService@1.0.0');
  }

  private getUserId(userId?: string): string {
    return String(userId || this.context.user?._id);
  }

  private async getClient(userId?: string) {
    const uid = this.getUserId(userId);
    const authClient = await this.authService.getAuthorizedClient(uid);
    return google.gmail({ version: 'v1', auth: authClient });
  }

  private labelCacheKey(userId?: string): string {
    return `google:${this.getUserId(userId)}:gmail:labels`;
  }

  async getProfile(userId?: string): Promise<IGmailProfile> {
    const gmail = await this.getClient(userId);
    const res = await gmail.users.getProfile({ userId: 'me' });
    return {
      emailAddress: res.data.emailAddress || '',
      messagesTotal: res.data.messagesTotal ?? undefined,
      threadsTotal: res.data.threadsTotal ?? undefined,
      historyId: res.data.historyId ?? undefined,
    };
  }

  async listLabels(userId?: string): Promise<IGmailLabel[]> {
    const cacheKey = this.labelCacheKey(userId);
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    const gmail = await this.getClient(userId);
    const res = await gmail.users.labels.list({ userId: 'me' });
    const labels = (res.data.labels || []).map((l: any) => ({
      id: l.id,
      name: l.name,
      type: l.type,
      messageListVisibility: l.messageListVisibility,
      labelListVisibility: l.labelListVisibility,
      color: l.color,
      messagesTotal: l.messagesTotal,
      messagesUnread: l.messagesUnread,
      threadsTotal: l.threadsTotal,
      threadsUnread: l.threadsUnread,
    })) as IGmailLabel[];

    await this.redisService.set(cacheKey, JSON.stringify(labels), LABEL_CACHE_TTL).catch(() => {});
    return labels;
  }

  async createLabel(userId: string, name: string, options: any = {}): Promise<IGmailLabel> {
    const gmail = await this.getClient(userId);
    const res = await gmail.users.labels.create({
      userId: 'me',
      requestBody: { name, ...options },
    });
    await this.redisService.del(this.labelCacheKey(userId)).catch(() => {});
    return res.data as IGmailLabel;
  }

  async deleteLabel(userId: string, labelId: string): Promise<void> {
    const gmail = await this.getClient(userId);
    await gmail.users.labels.delete({ userId: 'me', id: labelId });
    await this.redisService.del(this.labelCacheKey(userId)).catch(() => {});
  }

  /**
   * List messages. The `query` (Gmail search syntax) and label filters are honoured;
   * `bodyFormat` controls how much body is returned (default: plain text, HTML stripped).
   */
  async listMessages(userId: string, options: IGmailListOptions = {}): Promise<IGmailMessageList> {
    const gmail = await this.getClient(userId);
    const bodyFormat: GmailBodyFormat = options.bodyFormat || 'text';

    const res = await gmail.users.messages.list({
      userId: 'me',
      q: options.query,
      labelIds: options.labelIds,
      maxResults: options.maxResults || 20,
      pageToken: options.pageToken,
      includeSpamTrash: options.includeSpamTrash,
    });

    const messageRefs = res.data.messages || [];
    const messages: IGmailMessage[] = [];

    for (const ref of messageRefs) {
      if (ref.id) {
        try {
          const msg = await this.getMessage(userId, ref.id, { bodyFormat });
          messages.push(msg);
        } catch (err) {
          logger.warn(`Failed to fetch message ${ref.id}:`, err);
        }
      }
    }

    return {
      messages,
      nextPageToken: res.data.nextPageToken || undefined,
      resultSizeEstimate: res.data.resultSizeEstimate ?? undefined,
    };
  }

  /**
   * Fetch a single message. Bodies are assembled from the MIME part tree; HTML is
   * converted to plain text unless `bodyFormat` explicitly asks for HTML.
   */
  async getMessage(
    userId: string,
    messageId: string,
    options: IGmailGetOptions = {}
  ): Promise<IGmailMessage> {
    const gmail = await this.getClient(userId);
    const bodyFormat: GmailBodyFormat = options.bodyFormat || 'text';
    const format = bodyFormat === 'metadata' ? 'metadata' : 'full';

    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format,
      ...(format === 'metadata'
        ? { metadataHeaders: ['Subject', 'From', 'To', 'Cc', 'Bcc', 'Date', 'Reply-To'] }
        : {}),
    });

    const data = res.data;
    const headers = parseMessageHeaders(
      (data.payload?.headers || []).map((h: any) => ({
        name: h.name ?? undefined,
        value: h.value ?? undefined,
      })),
    );

    const msg: IGmailMessage = {
      id: data.id || messageId,
      threadId: data.threadId || '',
      labelIds: data.labelIds || [],
      snippet: data.snippet || undefined,
      internalDate: data.internalDate || undefined,
      historyId: data.historyId || undefined,
      sizeEstimate: data.sizeEstimate || undefined,
      subject: headers['subject'],
      date: headers['date'],
      from: headers['from'] ? parseEmailHeader(headers['from']) : undefined,
      to: parseAddressList(headers['to']),
      cc: parseAddressList(headers['cc']),
      bcc: parseAddressList(headers['bcc']),
      replyTo: headers['reply-to'] ? parseEmailHeader(headers['reply-to']) : undefined,
      headers,
    };

    if (bodyFormat !== 'metadata') {
      const extracted = extractBody(data.payload);
      if (extracted.attachments.length) msg.attachments = extracted.attachments;

      if (bodyFormat === 'html') {
        msg.htmlBody = extracted.html;
      } else if (bodyFormat === 'full') {
        msg.plainBody = bestEffortTextBody(extracted.plain, extracted.html);
        msg.htmlBody = extracted.html;
      } else {
        // 'text' (default): plain text, HTML converted when only HTML is present.
        msg.plainBody = bestEffortTextBody(extracted.plain, extracted.html);
      }
    }

    return msg;
  }

  async getThread(userId: string, threadId: string, options: IGmailGetOptions = {}): Promise<IGmailThread> {
    const gmail = await this.getClient(userId);
    const res = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    });

    const bodyFormat: GmailBodyFormat = options.bodyFormat || 'text';
    const messages: IGmailMessage[] = (res.data.messages || []).map((m: any) => {
      const headers = parseMessageHeaders(
        (m.payload?.headers || []).map((h: any) => ({ name: h.name ?? undefined, value: h.value ?? undefined })),
      );
      const extracted = extractBody(m.payload);
      const msg: IGmailMessage = {
        id: m.id || '',
        threadId: m.threadId || threadId,
        labelIds: m.labelIds || [],
        snippet: m.snippet || undefined,
        internalDate: m.internalDate || undefined,
        historyId: m.historyId || undefined,
        subject: headers['subject'],
        date: headers['date'],
        from: headers['from'] ? parseEmailHeader(headers['from']) : undefined,
        to: parseAddressList(headers['to']),
        cc: parseAddressList(headers['cc']),
        headers,
      };
      if (bodyFormat !== 'metadata') {
        msg.plainBody = bestEffortTextBody(extracted.plain, extracted.html);
        if (bodyFormat === 'html' || bodyFormat === 'full') msg.htmlBody = extracted.html;
      }
      return msg;
    });

    return {
      id: res.data.id || threadId,
      snippet: res.data.snippet || undefined,
      historyId: res.data.historyId || undefined,
      messages,
    };
  }

  /**
   * Send a message. `input` is the shape the resolvers/macros use:
   * `{ to: string|string[], cc?, bcc?, subject, body, isHtml?, inReplyTo?, threadId? }`.
   */
  async sendMessage(userId: string, input: any): Promise<IGmailMessage> {
    const to = Array.isArray(input?.to) ? input.to.join(', ') : String(input?.to || '');
    const options: IGmailSendOptions = {
      cc: input?.cc,
      bcc: input?.bcc,
      isHtml: input?.isHtml,
      inReplyTo: input?.replyToMessageId || input?.inReplyTo,
      threadId: input?.threadId,
    };
    const raw = buildRfc2822(to, input?.subject || '', input?.body || '', options);
    const encoded = encodeBase64Url(raw);

    const gmail = await this.getClient(userId);
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encoded,
        threadId: options.threadId,
      },
    });

    return {
      id: res.data.id || '',
      threadId: res.data.threadId || '',
      labelIds: res.data.labelIds || [],
    };
  }

  async createDraft(userId: string, input: any): Promise<IGmailDraft> {
    const to = Array.isArray(input?.to) ? input.to.join(', ') : String(input?.to || '');
    const raw = buildRfc2822(to, input?.subject || '', input?.body || '', { isHtml: input?.isHtml, cc: input?.cc, bcc: input?.bcc });
    const encoded = encodeBase64Url(raw);

    const gmail = await this.getClient(userId);
    const res = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: { raw: encoded },
      },
    });

    return {
      id: res.data.id || '',
      message: { id: res.data.message?.id || '', threadId: res.data.message?.threadId || '' },
    };
  }

  async updateDraft(userId: string, draftId: string, data: any): Promise<IGmailDraft> {
    const gmail = await this.getClient(userId);
    const res = await gmail.users.drafts.update({
      userId: 'me',
      id: draftId,
      requestBody: data,
    });

    return {
      id: res.data.id || draftId,
      message: { id: res.data.message?.id || '', threadId: res.data.message?.threadId || '' },
    };
  }

  async sendDraft(userId: string, draftId: string): Promise<IGmailMessage> {
    const gmail = await this.getClient(userId);
    const res = await gmail.users.drafts.send({
      userId: 'me',
      requestBody: { id: draftId },
    });

    return {
      id: res.data.id || '',
      threadId: res.data.threadId || '',
      labelIds: res.data.labelIds || [],
    };
  }

  async deleteDraft(userId: string, draftId: string): Promise<void> {
    const gmail = await this.getClient(userId);
    await gmail.users.drafts.delete({ userId: 'me', id: draftId });
  }

  async replyToMessage(
    userId: string,
    messageId: string,
    body: string,
    options: IGmailSendOptions = {}
  ): Promise<IGmailMessage> {
    const original = await this.getMessage(userId, messageId, { bodyFormat: 'metadata' });
    const to = original.from?.email || '';
    const subject = `Re: ${original.subject || ''}`;

    return this.sendMessage(userId, {
      to: [to],
      subject,
      body,
      isHtml: options.isHtml,
      replyToMessageId: messageId,
      threadId: original.threadId,
    });
  }

  async forwardMessage(userId: string, messageId: string, to: string): Promise<IGmailMessage> {
    const original = await this.getMessage(userId, messageId, { bodyFormat: 'text' });
    const subject = `Fwd: ${original.subject || ''}`;
    const body = `---------- Forwarded message ----------\nFrom: ${original.from?.email}\nSubject: ${original.subject}\n\n${original.plainBody || ''}`;

    return this.sendMessage(userId, { to: [to], subject, body });
  }

  async trashMessage(userId: string, messageId: string): Promise<void> {
    const gmail = await this.getClient(userId);
    await gmail.users.messages.trash({ userId: 'me', id: messageId });
  }

  async untrashMessage(userId: string, messageId: string): Promise<void> {
    const gmail = await this.getClient(userId);
    await gmail.users.messages.untrash({ userId: 'me', id: messageId });
  }

  async batchModifyMessages(
    userId: string,
    messageIds: string[],
    addLabelIds: string[] = [],
    removeLabelIds: string[] = []
  ): Promise<void> {
    const gmail = await this.getClient(userId);
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: messageIds,
        addLabelIds,
        removeLabelIds,
      },
    });
  }

  async getAttachment(
    userId: string,
    messageId: string,
    attachmentId: string
  ): Promise<IGmailAttachment> {
    const gmail = await this.getClient(userId);
    const res = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    });

    return {
      attachmentId,
      filename: '',
      mimeType: '',
      size: res.data.size || 0,
      data: res.data.data || undefined,
    };
  }

  async watchMailbox(userId: string, topicName: string, labelIds: string[] = []): Promise<any> {
    const gmail = await this.getClient(userId);
    const res = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName,
        labelIds: labelIds.length ? labelIds : ['INBOX'],
      },
    });

    const uid = this.getUserId(userId);
    await GoogleWebhookChannel.findOneAndUpdate(
      { userId: uid, service: 'gmail' },
      {
        userId: uid,
        channelId: `gmail-${uid}-${Date.now()}`,
        resourceId: res.data.historyId || '',
        service: 'gmail',
        expiration: new Date(Number(res.data.expiration)),
        token: topicName,
        active: true,
      },
      { upsert: true, new: true }
    );

    return res.data;
  }

  async stopWatch(userId: string): Promise<void> {
    const gmail = await this.getClient(userId);
    await gmail.users.stop({ userId: 'me' });
    const uid = this.getUserId(userId);
    await GoogleWebhookChannel.updateMany({ userId: uid, service: 'gmail' }, { active: false });
  }
}

export const GmailServiceDefinition: Reactory.Service.IReactoryServiceDefinition<GmailService> = {
  service: (props: any, context: any) => new GmailService(props, context),
  id: 'google.GmailService@1.0.0',
  name: 'GmailService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Gmail API operations service',
  serviceType: 'messaging',
  dependencies: [
    { id: 'google.GoogleAuthService@1.0.0', alias: 'googleAuthService' },
    { id: 'core.ReactoryFileService@1.0.0', alias: 'fileService' },
    { id: 'core.RedisService@1.0.0', alias: 'redisService' },
  ],
};

export { GmailService };
