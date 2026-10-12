import Reactory from '@reactorynet/reactory-core';
import { service } from '@reactory/server-core/application/decorators/service';
import { google } from 'googleapis';
import {
  IDriveFile,
  IDriveFileList,
  IDrivePermission,
  IDriveListOptions,
  ISharedDrive,
} from '../types/drive.types';

const FOLDER_CACHE_TTL = 300;

/**
 * Public API is **userId-first** (matching GoogleAuthService and the module's
 * resolvers / macros / CLI). `userId` falls back to the execution context user
 * when omitted.
 */
@service({
  id: 'google.DriveService@1.0.0',
  name: 'DriveService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google Drive API operations service',
  serviceType: 'storage',
  lifeCycle: 'singleton',
  dependencies: [
    { id: 'google.GoogleAuthService@1.0.0', alias: 'googleAuthService' },
    { id: 'core.ReactoryFileService@1.0.0', alias: 'fileService' },
    { id: 'core.RedisService@1.0.0', alias: 'redisService' },
  ],
})
class DriveService implements Reactory.Service.IReactoryService {
  name: string = 'DriveService';
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

  private getUserId(userId?: string): string {
    return String(userId || this.context.user?._id);
  }

  private async getClient(userId?: string) {
    const uid = this.getUserId(userId);
    const authClient = await this.authService.getAuthorizedClient(uid);
    return google.drive({ version: 'v3', auth: authClient });
  }

  private folderCacheKey(userId: string, folderId: string): string {
    return `google:${this.getUserId(userId)}:drive:folder:${folderId}`;
  }

  async listFiles(userId: string, options: IDriveListOptions = {}): Promise<IDriveFileList> {
    let q = options.query || '';
    if (options.folderId) {
      const parentQ = `'${options.folderId}' in parents`;
      q = q ? `(${q}) and ${parentQ}` : parentQ;
    }
    if (options.mimeType) {
      const typeQ = `mimeType='${options.mimeType}'`;
      q = q ? `(${q}) and ${typeQ}` : typeQ;
    }

    const cacheKey = options.folderId ? this.folderCacheKey(userId, options.folderId) : null;
    if (cacheKey) {
      try {
        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch {}
    }

    const drive = await this.getClient(userId);
    const res = await drive.files.list({
      q,
      pageSize: options.maxResults || 100,
      pageToken: options.pageToken,
      orderBy: options.orderBy,
      fields: 'nextPageToken,files(id,name,mimeType,size,webViewLink,webContentLink,iconLink,thumbnailLink,createdTime,modifiedTime,parents,owners,shared,ownedByMe,trashed,starred)',
      supportsAllDrives: options.supportsAllDrives || false,
      includeItemsFromAllDrives: options.includeTeamDriveItems || false,
    });

    const result: IDriveFileList = {
      files: (res.data.files || []) as IDriveFile[],
      nextPageToken: res.data.nextPageToken || undefined,
    };

    if (cacheKey) {
      await this.redisService.set(cacheKey, JSON.stringify(result), FOLDER_CACHE_TTL).catch(() => {});
    }

    return result;
  }

  async getFile(userId: string, fileId: string): Promise<IDriveFile> {
    const drive = await this.getClient(userId);
    const res = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType,size,webViewLink,webContentLink,iconLink,thumbnailLink,createdTime,modifiedTime,parents,owners,permissions,shared,ownedByMe,trashed,starred',
    });
    return res.data as IDriveFile;
  }

  async createFile(userId: string, metadata: any, media?: any): Promise<IDriveFile> {
    const drive = await this.getClient(userId);
    const res = await drive.files.create({
      requestBody: metadata,
      media: media,
      fields: 'id,name,mimeType,parents,webViewLink',
    });

    // Invalidate parent folder cache
    if (metadata.parents?.[0]) {
      await this.redisService.del(this.folderCacheKey(userId, metadata.parents[0])).catch(() => {});
    }

    return res.data as IDriveFile;
  }

  async updateFile(userId: string, fileId: string, metadata: any, media?: any): Promise<IDriveFile> {
    const drive = await this.getClient(userId);
    const res = await drive.files.update({
      fileId,
      requestBody: metadata,
      media: media,
      fields: 'id,name,mimeType,parents,webViewLink,modifiedTime',
    });
    return res.data as IDriveFile;
  }

  async deleteFile(userId: string, fileId: string): Promise<void> {
    const file = await this.getFile(userId, fileId).catch(() => null);
    const drive = await this.getClient(userId);
    await drive.files.delete({ fileId });

    if (file?.parents?.[0]) {
      await this.redisService.del(this.folderCacheKey(userId, file.parents[0])).catch(() => {});
    }
  }

  async moveFile(userId: string, fileId: string, newParentId: string): Promise<IDriveFile> {
    const file = await this.getFile(userId, fileId);
    const drive = await this.getClient(userId);
    const res = await drive.files.update({
      fileId,
      addParents: newParentId,
      removeParents: file.parents?.join(','),
      fields: 'id,name,mimeType,parents',
    });

    // Invalidate both old and new parent folder caches
    if (file.parents?.[0]) {
      await this.redisService.del(this.folderCacheKey(userId, file.parents[0])).catch(() => {});
    }
    await this.redisService.del(this.folderCacheKey(userId, newParentId)).catch(() => {});

    return res.data as IDriveFile;
  }

  async copyFile(userId: string, fileId: string, options: any = {}): Promise<IDriveFile> {
    const drive = await this.getClient(userId);
    const res = await drive.files.copy({
      fileId,
      requestBody: options,
      fields: 'id,name,mimeType,parents,webViewLink',
    });
    return res.data as IDriveFile;
  }

  async downloadFile(userId: string, fileId: string): Promise<Buffer> {
    const drive = await this.getClient(userId);
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    return Buffer.from(res.data as ArrayBuffer);
  }

  async exportFile(userId: string, fileId: string, mimeType: string): Promise<Buffer> {
    const drive = await this.getClient(userId);
    const res = await drive.files.export(
      { fileId, mimeType },
      { responseType: 'arraybuffer' }
    );
    return Buffer.from(res.data as ArrayBuffer);
  }

  async createFolder(userId: string, name: string, parentId?: string): Promise<IDriveFile> {
    const metadata: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) metadata.parents = [parentId];
    return this.createFile(userId, metadata);
  }

  async listPermissions(userId: string, fileId: string): Promise<IDrivePermission[]> {
    const drive = await this.getClient(userId);
    const res = await drive.permissions.list({
      fileId,
      fields: 'permissions(id,type,role,emailAddress,displayName,domain)',
    });
    return (res.data.permissions || []) as IDrivePermission[];
  }

  async createPermission(userId: string, fileId: string, permission: Partial<IDrivePermission>): Promise<IDrivePermission> {
    const drive = await this.getClient(userId);
    const res = await drive.permissions.create({
      fileId,
      requestBody: permission as any,
      fields: 'id,type,role,emailAddress,displayName',
    });
    return res.data as IDrivePermission;
  }

  async deletePermission(userId: string, fileId: string, permissionId: string): Promise<void> {
    const drive = await this.getClient(userId);
    await drive.permissions.delete({ fileId, permissionId });
  }

  async listRevisions(userId: string, fileId: string): Promise<any[]> {
    const drive = await this.getClient(userId);
    const res = await drive.revisions.list({
      fileId,
      fields: 'revisions(id,mimeType,modifiedTime,keepForever,published)',
    });
    return res.data.revisions || [];
  }

  async listSharedDrives(userId?: string): Promise<ISharedDrive[]> {
    const drive = await this.getClient(userId);
    const res = await drive.drives.list({
      fields: 'drives(id,name,colorRgb,createdTime,capabilities)',
    });
    return (res.data.drives || []) as ISharedDrive[];
  }

  async searchFiles(userId: string, query: string, options: IDriveListOptions = {}): Promise<IDriveFileList> {
    return this.listFiles(userId, { ...options, query });
  }

  generateThumbnailLink(fileId: string): string {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
  }
}

export const DriveServiceDefinition: Reactory.Service.IReactoryServiceDefinition<DriveService> = {
  service: (props: any, context: any) => new DriveService(props, context),
  id: 'google.DriveService@1.0.0',
  name: 'DriveService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google Drive API operations service',
  serviceType: 'storage',
  dependencies: [
    { id: 'google.GoogleAuthService@1.0.0', alias: 'googleAuthService' },
    { id: 'core.ReactoryFileService@1.0.0', alias: 'fileService' },
    { id: 'core.RedisService@1.0.0', alias: 'redisService' },
  ],
};

export { DriveService };
