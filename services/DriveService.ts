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

  private get redisService(): any {
    return this.context.getService('core.RedisService@1.0.0');
  }

  private getUserId(): string {
    return String(this.context.user?._id);
  }

  private async getClient() {
    const userId = this.getUserId();
    const authClient = await this.authService.getAuthorizedClient(userId);
    return google.drive({ version: 'v3', auth: authClient });
  }

  private folderCacheKey(folderId: string): string {
    return `google:${this.getUserId()}:drive:folder:${folderId}`;
  }

  async listFiles(options: IDriveListOptions = {}): Promise<IDriveFileList> {
    let q = options.query || '';
    if (options.folderId) {
      const parentQ = `'${options.folderId}' in parents`;
      q = q ? `(${q}) and ${parentQ}` : parentQ;
    }
    if (options.mimeType) {
      const typeQ = `mimeType='${options.mimeType}'`;
      q = q ? `(${q}) and ${typeQ}` : typeQ;
    }

    const cacheKey = options.folderId ? this.folderCacheKey(options.folderId) : null;
    if (cacheKey) {
      try {
        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch {}
    }

    const drive = await this.getClient();
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

  async getFile(fileId: string): Promise<IDriveFile> {
    const drive = await this.getClient();
    const res = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType,size,webViewLink,webContentLink,iconLink,thumbnailLink,createdTime,modifiedTime,parents,owners,permissions,shared,ownedByMe,trashed,starred',
    });
    return res.data as IDriveFile;
  }

  async createFile(metadata: any, media?: any): Promise<IDriveFile> {
    const drive = await this.getClient();
    const res = await drive.files.create({
      requestBody: metadata,
      media: media,
      fields: 'id,name,mimeType,parents,webViewLink',
    });

    // Invalidate parent folder cache
    if (metadata.parents?.[0]) {
      await this.redisService.del(this.folderCacheKey(metadata.parents[0])).catch(() => {});
    }

    return res.data as IDriveFile;
  }

  async updateFile(fileId: string, metadata: any, media?: any): Promise<IDriveFile> {
    const drive = await this.getClient();
    const res = await drive.files.update({
      fileId,
      requestBody: metadata,
      media: media,
      fields: 'id,name,mimeType,parents,webViewLink,modifiedTime',
    });
    return res.data as IDriveFile;
  }

  async deleteFile(fileId: string): Promise<void> {
    const file = await this.getFile(fileId).catch(() => null);
    const drive = await this.getClient();
    await drive.files.delete({ fileId });

    if (file?.parents?.[0]) {
      await this.redisService.del(this.folderCacheKey(file.parents[0])).catch(() => {});
    }
  }

  async moveFile(fileId: string, newParentId: string): Promise<IDriveFile> {
    const file = await this.getFile(fileId);
    const drive = await this.getClient();
    const res = await drive.files.update({
      fileId,
      addParents: newParentId,
      removeParents: file.parents?.join(','),
      fields: 'id,name,mimeType,parents',
    });

    // Invalidate both old and new parent folder caches
    if (file.parents?.[0]) {
      await this.redisService.del(this.folderCacheKey(file.parents[0])).catch(() => {});
    }
    await this.redisService.del(this.folderCacheKey(newParentId)).catch(() => {});

    return res.data as IDriveFile;
  }

  async copyFile(fileId: string, options: any = {}): Promise<IDriveFile> {
    const drive = await this.getClient();
    const res = await drive.files.copy({
      fileId,
      requestBody: options,
      fields: 'id,name,mimeType,parents,webViewLink',
    });
    return res.data as IDriveFile;
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    const drive = await this.getClient();
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    return Buffer.from(res.data as ArrayBuffer);
  }

  async exportFile(fileId: string, mimeType: string): Promise<Buffer> {
    const drive = await this.getClient();
    const res = await drive.files.export(
      { fileId, mimeType },
      { responseType: 'arraybuffer' }
    );
    return Buffer.from(res.data as ArrayBuffer);
  }

  async createFolder(name: string, parentId?: string): Promise<IDriveFile> {
    const metadata: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) metadata.parents = [parentId];
    return this.createFile(metadata);
  }

  async listPermissions(fileId: string): Promise<IDrivePermission[]> {
    const drive = await this.getClient();
    const res = await drive.permissions.list({
      fileId,
      fields: 'permissions(id,type,role,emailAddress,displayName,domain)',
    });
    return (res.data.permissions || []) as IDrivePermission[];
  }

  async createPermission(fileId: string, permission: Partial<IDrivePermission>): Promise<IDrivePermission> {
    const drive = await this.getClient();
    const res = await drive.permissions.create({
      fileId,
      requestBody: permission as any,
      fields: 'id,type,role,emailAddress,displayName',
    });
    return res.data as IDrivePermission;
  }

  async deletePermission(fileId: string, permissionId: string): Promise<void> {
    const drive = await this.getClient();
    await drive.permissions.delete({ fileId, permissionId });
  }

  async listRevisions(fileId: string): Promise<any[]> {
    const drive = await this.getClient();
    const res = await drive.revisions.list({
      fileId,
      fields: 'revisions(id,mimeType,modifiedTime,keepForever,published)',
    });
    return res.data.revisions || [];
  }

  async listSharedDrives(): Promise<ISharedDrive[]> {
    const drive = await this.getClient();
    const res = await drive.drives.list({
      fields: 'drives(id,name,colorRgb,createdTime,capabilities)',
    });
    return (res.data.drives || []) as ISharedDrive[];
  }

  async searchFiles(query: string): Promise<IDriveFileList> {
    return this.listFiles({ query });
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
