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
  IGmailSendOptions,
  IEmailAddress,
} from '../types/gmail.types';
import { GoogleWebhookChannel } from '../models/GoogleWebhookChannel';

const LABEL_CACHE_TTL = 300;

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

  private get redisService(): any {
    return this.context.getService('core.RedisService@1.0.0');
  }

  private get auditService(): any {
    return this.context.getService('google.GoogleAuditService@1.0.0');
  }

  private getUserId(): string {
    return String(this.context.user?._id);
  }

  private async getClient() {
    const userId = this.getUserId();
    const authClient = await this.authService.getAuthorizedClient(userId);
    return google.gmail({ version: 'v1', auth: authClient });
  }

  private labelCacheKey(): string {
    return `google:${this.getUserId()}:gmail:labels`;
  }

  async getProfile(): Promise<IGmailProfile> {
    const gmail = await this.getClient();
    const res = await gmail.users.getProfile({ userId: 'me' });
    return {
      emailAddress: res.data.emailAddress || '',
      messagesTotal: res.data.messagesTotal ?? undefined,
      threadsTotal: res.data.threadsTotal ?? undefined,
      historyId: res.data.historyId ?? undefined,
    };
  }

  async listLabels(): Promise<IGmailLabel[]> {
    const cacheKey = this.labelCacheKey();
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    const gmail = await this.getClient();
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

  async createLabel(name: string, options: any = {}): Promise<IGmailLabel> {
    const gmail = await this.getClient();
    const res = await gmail.users.labels.create({
      userId: 'me',
      requestBody: { name, ...options },
    });
    await this.redisService.del(this.labelCacheKey()).catch(() => {});
    return res.data as IGmailLabel;
  }

  async deleteLabel(labelId: string): Promise<void> {
    const gmail = await this.getClient();
    await gmail.users.labels.delete({ userId: 'me', id: labelId });
    await this.redisService.del(this.labelCacheKey()).catch(() => {});
  }

  async listMessages(options: IGmailListOptions = {}): Promise<IGmailMessageList> {
    const gmail = await this.getClient();
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
          const msg = await this.getMessage(ref.id);
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

  async getMessage(messageId: string): Promise<IGmailMessage> {
    const gmail = await this.getClient();
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
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
      to: headers['to'] ? [parseEmailHeader(headers['to'])] : [],
      replyTo: headers['reply-to'] ? parseEmailHeader(headers['reply-to']) : undefined,
      headers,
    };

    // Extract body
    if (data.payload?.body?.data) {
      msg.plainBody = Buffer.from(data.payload.body.data, 'base64').toString('utf8');
    }

    return msg;
  }

  async getThread(threadId: string): Promise<IGmailThread> {
    const gmail = await this.getClient();
    const res = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    });
    return {
      id: res.data.id || threadId,
      snippet: res.data.snippet || undefined,
      historyId: res.data.historyId || undefined,
      messages: [],
    };
  }

  async sendMessage(
    to: string,
    subject: string,
    body: string,
    options: IGmailSendOptions = {}
  ): Promise<IGmailMessage> {
    const raw = buildRfc2822(to, subject, body, options);
    const encoded = encodeBase64Url(raw);

    const gmail = await this.getClient();
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

  async createDraft(
    to: string,
    subject: string,
    body: string,
    options: IGmailSendOptions = {}
  ): Promise<IGmailDraft> {
    const raw = buildRfc2822(to, subject, body, options);
    const encoded = encodeBase64Url(raw);

    const gmail = await this.getClient();
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

  async updateDraft(draftId: string, data: any): Promise<IGmailDraft> {
    const gmail = await this.getClient();
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

  async sendDraft(draftId: string): Promise<IGmailMessage> {
    const gmail = await this.getClient();
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

  async deleteDraft(draftId: string): Promise<void> {
    const gmail = await this.getClient();
    await gmail.users.drafts.delete({ userId: 'me', id: draftId });
  }

  async replyToMessage(
    messageId: string,
    body: string,
    options: IGmailSendOptions = {}
  ): Promise<IGmailMessage> {
    const original = await this.getMessage(messageId);
    const to = original.from?.email || '';
    const subject = `Re: ${original.subject || ''}`;

    return this.sendMessage(to, subject, body, {
      ...options,
      inReplyTo: messageId,
      threadId: original.threadId,
    });
  }

  async forwardMessage(messageId: string, to: string): Promise<IGmailMessage> {
    const original = await this.getMessage(messageId);
    const subject = `Fwd: ${original.subject || ''}`;
    const body = `---------- Forwarded message ----------\nFrom: ${original.from?.email}\nSubject: ${original.subject}\n\n${original.plainBody || ''}`;

    return this.sendMessage(to, subject, body);
  }

  async trashMessage(messageId: string): Promise<void> {
    const gmail = await this.getClient();
    await gmail.users.messages.trash({ userId: 'me', id: messageId });
  }

  async untrashMessage(messageId: string): Promise<void> {
    const gmail = await this.getClient();
    await gmail.users.messages.untrash({ userId: 'me', id: messageId });
  }

  async batchModifyMessages(
    messageIds: string[],
    addLabelIds: string[] = [],
    removeLabelIds: string[] = []
  ): Promise<void> {
    const gmail = await this.getClient();
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
    messageId: string,
    attachmentId: string
  ): Promise<IGmailAttachment> {
    const gmail = await this.getClient();
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

  async watchMailbox(topicName: string, labelIds: string[] = []): Promise<any> {
    const gmail = await this.getClient();
    const res = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName,
        labelIds: labelIds.length ? labelIds : ['INBOX'],
      },
    });

    const userId = this.getUserId();
    await GoogleWebhookChannel.findOneAndUpdate(
      { userId, service: 'gmail' },
      {
        userId,
        channelId: `gmail-${userId}-${Date.now()}`,
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

  async stopWatch(): Promise<void> {
    const gmail = await this.getClient();
    await gmail.users.stop({ userId: 'me' });
    const userId = this.getUserId();
    await GoogleWebhookChannel.updateMany({ userId, service: 'gmail' }, { active: false });
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
