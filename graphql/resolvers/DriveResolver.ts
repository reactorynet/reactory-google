import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';

@resolver
class DriveResolver {
  resolver: any;

  private getService(context: Reactory.Server.IReactoryContext) {
    const svc = context.getService('google.DriveService@1.0.0') as any;
    if (!svc) throw new Error('Drive Service not available');
    return svc;
  }

  @roles(['USER'], 'args.context')
  @query('driveFiles')
  async listFiles(
    _obj: any,
    params: { folderId?: string; query?: string; orderBy?: string; pageSize?: number; pageToken?: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).listFiles(String(context.user._id), {
      folderId: params.folderId,
      q: params.query,
      orderBy: params.orderBy,
      pageSize: params.pageSize,
      pageToken: params.pageToken,
    });
  }

  @roles(['USER'], 'args.context')
  @query('driveFile')
  async getFile(
    _obj: any,
    params: { fileId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).getFile(String(context.user._id), params.fileId);
  }

  @roles(['USER'], 'args.context')
  @query('driveSearch')
  async searchFiles(
    _obj: any,
    params: { query: string; pageSize?: number; pageToken?: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).searchFiles(String(context.user._id), params.query, {
      pageSize: params.pageSize,
      pageToken: params.pageToken,
    });
  }

  @roles(['USER'], 'args.context')
  @query('sharedDrives')
  async listSharedDrives(_obj: any, _params: Record<string, unknown>, context: Reactory.Server.IReactoryContext) {
    return this.getService(context).listSharedDrives(String(context.user._id));
  }

  @roles(['USER'], 'args.context')
  @query('drivePermissions')
  async listPermissions(
    _obj: any,
    params: { fileId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).listPermissions(String(context.user._id), params.fileId);
  }

  @roles(['USER'], 'args.context')
  @mutation('driveCreateFolder')
  async createFolder(
    _obj: any,
    params: { name: string; parentId?: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).createFolder(String(context.user._id), params.name, params.parentId);
  }

  @roles(['USER'], 'args.context')
  @mutation('driveMoveFile')
  async moveFile(
    _obj: any,
    params: { fileId: string; targetFolderId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).moveFile(String(context.user._id), params.fileId, params.targetFolderId);
  }

  @roles(['USER'], 'args.context')
  @mutation('driveCopyFile')
  async copyFile(
    _obj: any,
    params: { fileId: string; name?: string; parentId?: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).copyFile(String(context.user._id), params.fileId, {
      name: params.name,
      parentId: params.parentId,
    });
  }

  @roles(['USER'], 'args.context')
  @mutation('driveDeleteFile')
  async deleteFile(
    _obj: any,
    params: { fileId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    await this.getService(context).deleteFile(String(context.user._id), params.fileId);
    return true;
  }

  @roles(['USER'], 'args.context')
  @mutation('driveUpdateFileName')
  async updateFileName(
    _obj: any,
    params: { fileId: string; name: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).updateFile(String(context.user._id), params.fileId, { name: params.name });
  }

  @roles(['USER'], 'args.context')
  @mutation('driveCreatePermission')
  async createPermission(
    _obj: any,
    params: { fileId: string; role: string; type: string; emailAddress?: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).createPermission(String(context.user._id), params.fileId, {
      role: params.role,
      type: params.type,
      emailAddress: params.emailAddress,
    });
  }

  @roles(['USER'], 'args.context')
  @mutation('driveDeletePermission')
  async deletePermission(
    _obj: any,
    params: { fileId: string; permissionId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    await this.getService(context).deletePermission(String(context.user._id), params.fileId, params.permissionId);
    return true;
  }
}

export default DriveResolver;
