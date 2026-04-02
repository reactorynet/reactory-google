import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';

@resolver
class ContactsResolver {
  resolver: any;

  private getService(context: Reactory.Server.IReactoryContext) {
    const svc = context.getService('google.ContactsService@1.0.0') as any;
    if (!svc) throw new Error('Contacts Service not available');
    return svc;
  }

  @roles(['USER'], 'args.context')
  @query('contacts')
  async listContacts(
    _obj: any,
    params: { pageSize?: number; pageToken?: string; query?: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).listContacts(String(context.user._id), {
      pageSize: params.pageSize,
      pageToken: params.pageToken,
    });
  }

  @roles(['USER'], 'args.context')
  @query('contact')
  async getContact(
    _obj: any,
    params: { resourceName: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).getContact(String(context.user._id), params.resourceName);
  }

  @roles(['USER'], 'args.context')
  @query('contactGroups')
  async listContactGroups(_obj: any, _params: Record<string, unknown>, context: Reactory.Server.IReactoryContext) {
    return this.getService(context).listContactGroups(String(context.user._id));
  }

  @roles(['USER'], 'args.context')
  @query('contactsSearch')
  async searchContacts(
    _obj: any,
    params: { query: string; readMask?: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).searchContacts(String(context.user._id), params.query, params.readMask);
  }

  @roles(['USER'], 'args.context')
  @query('directoryContacts')
  async searchDirectory(
    _obj: any,
    params: { query: string; readMask?: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).searchDirectory(String(context.user._id), params.query, params.readMask);
  }

  @roles(['USER'], 'args.context')
  @mutation('contactCreate')
  async createContact(
    _obj: any,
    params: { input: Record<string, any> },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).createContact(String(context.user._id), params.input);
  }

  @roles(['USER'], 'args.context')
  @mutation('contactUpdate')
  async updateContact(
    _obj: any,
    params: { resourceName: string; input: Record<string, any> },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).updateContact(String(context.user._id), params.resourceName, params.input);
  }

  @roles(['USER'], 'args.context')
  @mutation('contactDelete')
  async deleteContact(
    _obj: any,
    params: { resourceName: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    await this.getService(context).deleteContact(String(context.user._id), params.resourceName);
    return true;
  }

  @roles(['USER'], 'args.context')
  @mutation('contactGroupCreate')
  async createContactGroup(
    _obj: any,
    params: { name: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).createContactGroup(String(context.user._id), params.name);
  }

  @roles(['USER'], 'args.context')
  @mutation('contactGroupDelete')
  async deleteContactGroup(
    _obj: any,
    params: { resourceName: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    await this.getService(context).deleteContactGroup(String(context.user._id), params.resourceName);
    return true;
  }
}

export default ContactsResolver;
