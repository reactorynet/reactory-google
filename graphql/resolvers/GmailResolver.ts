import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';

@resolver
class GmailResolver {
  resolver: any;

  private getService(context: Reactory.Server.IReactoryContext) {
    const svc = context.getService('google.GmailService@1.0.0') as any;
    if (!svc) throw new Error('Gmail Service not available');
    return svc;
  }

  @roles(['USER'], 'args.context')
  @query('gmailProfile')
  async getProfile(_obj: any, _params: Record<string, unknown>, context: Reactory.Server.IReactoryContext) {
    return this.getService(context).getProfile(String(context.user._id));
  }

  @roles(['USER'], 'args.context')
  @query('gmailLabels')
  async listLabels(_obj: any, _params: Record<string, unknown>, context: Reactory.Server.IReactoryContext) {
    return this.getService(context).listLabels(String(context.user._id));
  }

  @roles(['USER'], 'args.context')
  @query('gmailMessages')
  async listMessages(
    _obj: any,
    params: { labelIds?: string[]; query?: string; maxResults?: number; pageToken?: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).listMessages(String(context.user._id), {
      labelIds: params.labelIds,
      q: params.query,
      maxResults: params.maxResults,
      pageToken: params.pageToken,
    });
  }

  @roles(['USER'], 'args.context')
  @query('gmailMessage')
  async getMessage(
    _obj: any,
    params: { messageId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).getMessage(String(context.user._id), params.messageId);
  }

  @roles(['USER'], 'args.context')
  @query('gmailThread')
  async getThread(
    _obj: any,
    params: { threadId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).getThread(String(context.user._id), params.threadId);
  }

  @roles(['USER'], 'args.context')
  @mutation('gmailSendMessage')
  async sendMessage(
    _obj: any,
    params: { input: Record<string, any> },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).sendMessage(String(context.user._id), params.input);
  }

  @roles(['USER'], 'args.context')
  @mutation('gmailTrashMessage')
  async trashMessage(
    _obj: any,
    params: { messageId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    await this.getService(context).trashMessage(String(context.user._id), params.messageId);
    return true;
  }

  @roles(['USER'], 'args.context')
  @mutation('gmailUntrashMessage')
  async untrashMessage(
    _obj: any,
    params: { messageId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    await this.getService(context).untrashMessage(String(context.user._id), params.messageId);
    return true;
  }

  @roles(['USER'], 'args.context')
  @mutation('gmailCreateLabel')
  async createLabel(
    _obj: any,
    params: { name: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).createLabel(String(context.user._id), params.name);
  }

  @roles(['USER'], 'args.context')
  @mutation('gmailDeleteLabel')
  async deleteLabel(
    _obj: any,
    params: { labelId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    await this.getService(context).deleteLabel(String(context.user._id), params.labelId);
    return true;
  }

  @roles(['USER'], 'args.context')
  @mutation('gmailBatchModifyMessages')
  async batchModifyMessages(
    _obj: any,
    params: { messageIds: string[]; addLabelIds?: string[]; removeLabelIds?: string[] },
    context: Reactory.Server.IReactoryContext,
  ) {
    await this.getService(context).batchModifyMessages(
      String(context.user._id),
      params.messageIds,
      { addLabelIds: params.addLabelIds, removeLabelIds: params.removeLabelIds },
    );
    return true;
  }

  @roles(['USER'], 'args.context')
  @mutation('gmailWatchMailbox')
  async watchMailbox(
    _obj: any,
    params: { labelIds?: string[] },
    context: Reactory.Server.IReactoryContext,
  ) {
    const result = await this.getService(context).watchMailbox(
      String(context.user._id),
      params.labelIds,
    );
    return result?.historyId || null;
  }

  @roles(['USER'], 'args.context')
  @mutation('gmailStopWatch')
  async stopWatch(_obj: any, _params: Record<string, unknown>, context: Reactory.Server.IReactoryContext) {
    await this.getService(context).stopWatch(String(context.user._id));
    return true;
  }
}

export default GmailResolver;
