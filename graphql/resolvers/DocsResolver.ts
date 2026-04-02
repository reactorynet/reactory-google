import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';

@resolver
class DocsResolver {
  resolver: any;

  private getService(context: Reactory.Server.IReactoryContext) {
    const svc = context.getService('google.DocsService@1.0.0') as any;
    if (!svc) throw new Error('Docs Service not available');
    return svc;
  }

  @roles(['USER'], 'args.context')
  @query('googleDoc')
  async getDocument(
    _obj: any,
    params: { documentId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).getDocument(String(context.user._id), params.documentId);
  }

  @roles(['USER'], 'args.context')
  @query('googleDocAsHtml')
  async getDocumentAsHtml(
    _obj: any,
    params: { documentId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).getDocumentAsHTML(String(context.user._id), params.documentId);
  }

  @roles(['USER'], 'args.context')
  @query('googleDocAsText')
  async getDocumentAsText(
    _obj: any,
    params: { documentId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).getDocumentAsPlainText(String(context.user._id), params.documentId);
  }

  @roles(['USER'], 'args.context')
  @mutation('googleDocCreate')
  async createDocument(
    _obj: any,
    params: { title: string; folderId?: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).createDocument(String(context.user._id), params.title, params.folderId);
  }

  @roles(['USER'], 'args.context')
  @mutation('googleDocInsertText')
  async insertText(
    _obj: any,
    params: { documentId: string; text: string; index?: number },
    context: Reactory.Server.IReactoryContext,
  ) {
    await this.getService(context).insertText(
      String(context.user._id),
      params.documentId,
      params.text,
      params.index,
    );
    return true;
  }

  @roles(['USER'], 'args.context')
  @mutation('googleDocReplaceText')
  async replaceText(
    _obj: any,
    params: { documentId: string; findText: string; replaceText: string; matchCase?: boolean },
    context: Reactory.Server.IReactoryContext,
  ) {
    const result = await this.getService(context).replaceText(
      String(context.user._id),
      params.documentId,
      params.findText,
      params.replaceText,
      params.matchCase,
    );
    return result?.occurrencesChanged || 0;
  }
}

export default DocsResolver;
