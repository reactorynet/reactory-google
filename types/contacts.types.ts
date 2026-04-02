/**
 * Google Contacts (People API) TypeScript types
 */

export interface IContactName {
  displayName?: string;
  familyName?: string;
  givenName?: string;
  middleName?: string;
  honorificPrefix?: string;
  honorificSuffix?: string;
}

export interface IContactEmailAddress {
  value?: string;
  type?: string;
  formattedType?: string;
  displayName?: string;
}

export interface IContactPhoneNumber {
  value?: string;
  type?: string;
  formattedType?: string;
  canonicalForm?: string;
}

export interface IContactAddress {
  formattedValue?: string;
  type?: string;
  formattedType?: string;
  streetAddress?: string;
  extendedAddress?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
}

export interface IContactOrganization {
  name?: string;
  title?: string;
  department?: string;
  type?: string;
  formattedType?: string;
}

export interface IGoogleContact {
  resourceName: string;
  etag?: string;
  names?: IContactName[];
  emailAddresses?: IContactEmailAddress[];
  phoneNumbers?: IContactPhoneNumber[];
  addresses?: IContactAddress[];
  organizations?: IContactOrganization[];
  photos?: Array<{ url?: string; default?: boolean }>;
  birthdays?: Array<{ date?: { year?: number; month?: number; day?: number } }>;
  biographies?: Array<{ value?: string; contentType?: string }>;
  memberships?: Array<{ contactGroupMembership?: { contactGroupId?: string; contactGroupResourceName?: string } }>;
  metadata?: any;
}

export interface IGoogleContactInput {
  names?: IContactName[];
  emailAddresses?: IContactEmailAddress[];
  phoneNumbers?: IContactPhoneNumber[];
  addresses?: IContactAddress[];
  organizations?: IContactOrganization[];
  birthdays?: Array<{ date?: { year?: number; month?: number; day?: number } }>;
  biographies?: Array<{ value?: string; contentType?: string }>;
}

export interface IContactGroup {
  resourceName: string;
  etag?: string;
  metadata?: any;
  groupType?: 'GROUP_TYPE_UNSPECIFIED' | 'USER_CONTACT_GROUP' | 'SYSTEM_CONTACT_GROUP';
  name?: string;
  formattedName?: string;
  memberCount?: number;
  memberResourceNames?: string[];
}

export interface IContactList {
  connections?: IGoogleContact[];
  otherContacts?: IGoogleContact[];
  nextPageToken?: string;
  nextSyncToken?: string;
  totalItems?: number;
  totalPeople?: number;
}
