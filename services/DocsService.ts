import Reactory from '@reactorynet/reactory-core';
import { service } from '@reactory/server-core/application/decorators/service';
import { google } from 'googleapis';
import { IGoogleDoc, IDocBatchUpdateRequest, IDocBatchUpdateResponse } from '../types/docs.types';

/**
 * Public API is **userId-first** (matching GoogleAuthService and the module's
 * resolvers / macros / CLI). `userId` falls back to the execution context user
 * when omitted.
 */
@service({
  id: 'google.DocsService@1.0.0',
  name: 'DocsService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google Docs API operations service',
  serviceType: 'data',
  lifeCycle: 'singleton',
  dependencies: [
    { id: 'google.GoogleAuthService@1.0.0', alias: 'googleAuthService' },
  ],
})
class DocsService implements Reactory.Service.IReactoryService {
  name: string = 'DocsService';
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

  private get driveService(): any {
    return this.context.getService('google.DriveService@1.0.0');
  }

  private getUserId(userId?: string): string {
    return String(userId || this.context.user?._id);
  }

  private async getClient(userId?: string) {
    const uid = this.getUserId(userId);
    const authClient = await this.authService.getAuthorizedClient(uid);
    return google.docs({ version: 'v1', auth: authClient });
  }

  async getDocument(userId: string, documentId: string): Promise<IGoogleDoc> {
    const docs = await this.getClient(userId);
    const res = await docs.documents.get({ documentId });
    return res.data as IGoogleDoc;
  }

  async createDocument(userId: string, title: string): Promise<IGoogleDoc> {
    const docs = await this.getClient(userId);
    const res = await docs.documents.create({ requestBody: { title } });
    return res.data as IGoogleDoc;
  }

  async batchUpdate(
    userId: string,
    documentId: string,
    requests: any[]
  ): Promise<IDocBatchUpdateResponse> {
    const docs = await this.getClient(userId);
    const res = await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });
    return res.data as IDocBatchUpdateResponse;
  }

  async insertText(userId: string, documentId: string, text: string, index: number = 1): Promise<void> {
    await this.batchUpdate(userId, documentId, [
      { insertText: { location: { index }, text } },
    ]);
  }

  async deleteContent(userId: string, documentId: string, startIndex: number, endIndex: number): Promise<void> {
    await this.batchUpdate(userId, documentId, [
      { deleteContentRange: { range: { startIndex, endIndex } } },
    ]);
  }

  async insertTable(
    userId: string,
    documentId: string,
    rows: number,
    cols: number,
    index: number = 1
  ): Promise<void> {
    await this.batchUpdate(userId, documentId, [
      { insertTable: { rows, columns: cols, location: { index } } },
    ]);
  }

  async insertImage(userId: string, documentId: string, imageUri: string, index: number = 1): Promise<void> {
    await this.batchUpdate(userId, documentId, [
      {
        insertInlineImage: {
          location: { index },
          uri: imageUri,
          objectSize: {
            height: { magnitude: 200, unit: 'PT' },
            width: { magnitude: 300, unit: 'PT' },
          },
        },
      },
    ]);
  }

  async replaceText(userId: string, documentId: string, find: string, replace: string): Promise<void> {
    await this.batchUpdate(userId, documentId, [
      {
        replaceAllText: {
          containsText: { text: find, matchCase: false },
          replaceText: replace,
        },
      },
    ]);
  }

  async updateParagraphStyle(
    userId: string,
    documentId: string,
    startIndex: number,
    endIndex: number,
    style: any
  ): Promise<void> {
    await this.batchUpdate(userId, documentId, [
      {
        updateParagraphStyle: {
          range: { startIndex, endIndex },
          paragraphStyle: style,
          fields: '*',
        },
      },
    ]);
  }

  async getDocumentAsHTML(userId: string, documentId: string): Promise<string> {
    const buffer = await this.driveService.exportFile(userId, documentId, 'text/html');
    return buffer.toString('utf8');
  }

  async getDocumentAsPlainText(userId: string, documentId: string): Promise<string> {
    const buffer = await this.driveService.exportFile(userId, documentId, 'text/plain');
    return buffer.toString('utf8');
  }
}

export const DocsServiceDefinition: Reactory.Service.IReactoryServiceDefinition<DocsService> = {
  service: (props: any, context: any) => new DocsService(props, context),
  id: 'google.DocsService@1.0.0',
  name: 'DocsService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google Docs API operations service',
  serviceType: 'data',
  dependencies: [
    { id: 'google.GoogleAuthService@1.0.0', alias: 'googleAuthService' },
  ],
};

export { DocsService };
