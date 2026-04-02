/**
 * Gmail-specific TypeScript types
 */

export interface IEmailAddress {
  name?: string;
  email: string;
}

export interface IGmailBody {
  mimeType: string;
  data?: string;
  size: number;
  attachmentId?: string;
}

export interface IGmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
  data?: string;
}

export interface IGmailLabel {
  id: string;
  name: string;
  type?: string;
  messageListVisibility?: string;
  labelListVisibility?: string;
  color?: {
    textColor: string;
    backgroundColor: string;
  };
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
}

export interface IGmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  historyId?: string;
  sizeEstimate?: number;
  from?: IEmailAddress;
  to?: IEmailAddress[];
  cc?: IEmailAddress[];
  bcc?: IEmailAddress[];
  subject?: string;
  date?: string;
  replyTo?: IEmailAddress;
  body?: IGmailBody;
  htmlBody?: string;
  plainBody?: string;
  attachments?: IGmailAttachment[];
  headers?: Record<string, string>;
}

export interface IGmailThread {
  id: string;
  snippet?: string;
  historyId?: string;
  messages?: IGmailMessage[];
}

export interface IGmailDraft {
  id: string;
  message?: IGmailMessage;
}

export interface IGmailProfile {
  emailAddress: string;
  messagesTotal?: number;
  threadsTotal?: number;
  historyId?: string;
}

export interface IGmailMessageList {
  messages: IGmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface IGmailListOptions {
  query?: string;
  labelIds?: string[];
  maxResults?: number;
  pageToken?: string;
  includeSpamTrash?: boolean;
}

export interface IGmailSendOptions {
  cc?: string[];
  bcc?: string[];
  isHtml?: boolean;
  attachmentFileIds?: string[];
  inReplyTo?: string;
  threadId?: string;
}
