import Reactory from '@reactorynet/reactory-core';
import { service } from '@reactory/server-core/application/decorators/service';
import { google } from 'googleapis';
import {
  IGoogleContact,
  IGoogleContactInput,
  IContactGroup,
  IContactList,
} from '../types/contacts.types';

const CONTACT_GROUPS_CACHE_TTL = 900; // 15 minutes

/**
 * Public API is **userId-first** (matching GoogleAuthService and the module's
 * resolvers / macros / CLI). `userId` falls back to the execution context user
 * when omitted.
 */
@service({
  id: 'google.ContactsService@1.0.0',
  name: 'ContactsService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google People (Contacts) API operations service',
  serviceType: 'data',
  lifeCycle: 'singleton',
  dependencies: [
    { id: 'google.GoogleAuthService@1.0.0', alias: 'googleAuthService' },
    { id: 'core.RedisService@1.0.0', alias: 'redisService' },
  ],
})
class ContactsService implements Reactory.Service.IReactoryService {
  name: string = 'ContactsService';
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
    return google.people({ version: 'v1', auth: authClient });
  }

  private groupsCacheKey(userId?: string): string {
    return `google:${this.getUserId(userId)}:contacts:groups`;
  }

  async listContacts(userId: string, options: { query?: string; maxResults?: number; pageToken?: string } = {}): Promise<IContactList> {
    const people = await this.getClient(userId);
    const res = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: options.maxResults || 100,
      pageToken: options.pageToken,
      personFields: 'names,emailAddresses,phoneNumbers,addresses,organizations,photos,birthdays,memberships',
    });
    return {
      connections: (res.data.connections || []) as IGoogleContact[],
      nextPageToken: res.data.nextPageToken || undefined,
      nextSyncToken: res.data.nextSyncToken || undefined,
      totalItems: res.data.totalItems ?? undefined,
      totalPeople: res.data.totalPeople ?? undefined,
    };
  }

  async getContact(userId: string, resourceName: string): Promise<IGoogleContact> {
    const people = await this.getClient(userId);
    const res = await people.people.get({
      resourceName,
      personFields: 'names,emailAddresses,phoneNumbers,addresses,organizations,photos,birthdays,memberships,biographies',
    });
    return res.data as IGoogleContact;
  }

  async createContact(userId: string, contact: IGoogleContactInput): Promise<IGoogleContact> {
    const people = await this.getClient(userId);
    const res = await people.people.createContact({
      requestBody: contact as any,
      personFields: 'names,emailAddresses,phoneNumbers',
    });
    return res.data as IGoogleContact;
  }

  async updateContact(userId: string, resourceName: string, contact: IGoogleContactInput): Promise<IGoogleContact> {
    // First get current contact to get etag
    const current = await this.getContact(userId, resourceName);
    const people = await this.getClient(userId);
    const res = await people.people.updateContact({
      resourceName,
      updatePersonFields: 'names,emailAddresses,phoneNumbers,addresses,organizations',
      requestBody: { ...contact, etag: (current as any).etag } as any,
    });
    return res.data as IGoogleContact;
  }

  async deleteContact(userId: string, resourceName: string): Promise<void> {
    const people = await this.getClient(userId);
    await people.people.deleteContact({ resourceName });
  }

  async searchContacts(userId: string, query: string): Promise<IContactList> {
    const people = await this.getClient(userId);
    const res = await people.people.searchContacts({
      query,
      readMask: 'names,emailAddresses,phoneNumbers,photos',
    });
    return {
      connections: (res.data.results?.map((r: any) => r.person) || []) as IGoogleContact[],
    };
  }

  async listContactGroups(userId?: string): Promise<IContactGroup[]> {
    const cacheKey = this.groupsCacheKey(userId);
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    const people = await this.getClient(userId);
    const res = await people.contactGroups.list({});
    const groups = (res.data.contactGroups || []) as IContactGroup[];

    await this.redisService.set(cacheKey, JSON.stringify(groups), CONTACT_GROUPS_CACHE_TTL).catch(() => {});
    return groups;
  }

  async createContactGroup(userId: string, name: string): Promise<IContactGroup> {
    const people = await this.getClient(userId);
    const res = await people.contactGroups.create({
      requestBody: { contactGroup: { name } },
    });
    await this.redisService.del(this.groupsCacheKey(userId)).catch(() => {});
    return res.data as IContactGroup;
  }

  async deleteContactGroup(userId: string, resourceName: string): Promise<void> {
    const people = await this.getClient(userId);
    await people.contactGroups.delete({ resourceName });
    await this.redisService.del(this.groupsCacheKey(userId)).catch(() => {});
  }

  async addContactToGroup(
    userId: string,
    contactResourceName: string,
    groupResourceName: string
  ): Promise<void> {
    const people = await this.getClient(userId);
    await people.contactGroups.members.modify({
      resourceName: groupResourceName,
      requestBody: {
        resourceNamesToAdd: [contactResourceName],
      },
    });
  }

  async removeContactFromGroup(
    userId: string,
    contactResourceName: string,
    groupResourceName: string
  ): Promise<void> {
    const people = await this.getClient(userId);
    await people.contactGroups.members.modify({
      resourceName: groupResourceName,
      requestBody: {
        resourceNamesToRemove: [contactResourceName],
      },
    });
  }

  async searchDirectory(userId: string, query: string): Promise<IContactList> {
    const people = await this.getClient(userId);
    const res = await people.people.searchDirectoryPeople({
      query,
      sources: ['DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE'],
      readMask: 'names,emailAddresses,photos,organizations',
    });
    return {
      connections: (res.data.people || []) as IGoogleContact[],
    };
  }

  async getOtherContacts(userId: string, options: { maxResults?: number; pageToken?: string } = {}): Promise<IContactList> {
    const people = await this.getClient(userId);
    const res = await people.otherContacts.list({
      pageSize: options.maxResults || 100,
      pageToken: options.pageToken,
      readMask: 'names,emailAddresses,phoneNumbers',
    });
    return {
      otherContacts: (res.data.otherContacts || []) as IGoogleContact[],
      nextPageToken: res.data.nextPageToken || undefined,
    };
  }
}

export const ContactsServiceDefinition: Reactory.Service.IReactoryServiceDefinition<ContactsService> = {
  service: (props: any, context: any) => new ContactsService(props, context),
  id: 'google.ContactsService@1.0.0',
  name: 'ContactsService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google People (Contacts) API operations service',
  serviceType: 'data',
  dependencies: [
    { id: 'google.GoogleAuthService@1.0.0', alias: 'googleAuthService' },
    { id: 'core.RedisService@1.0.0', alias: 'redisService' },
  ],
};

export { ContactsService };
