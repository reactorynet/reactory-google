/**
 * Google Drive-specific TypeScript types
 */

export interface IDriveUser {
  kind?: string;
  displayName?: string;
  photoLink?: string;
  me?: boolean;
  permissionId?: string;
  emailAddress?: string;
}

export interface IDrivePermission {
  id: string;
  type: 'user' | 'group' | 'domain' | 'anyone';
  role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
  emailAddress?: string;
  displayName?: string;
  domain?: string;
  allowFileDiscovery?: boolean;
  expirationTime?: string;
}

export interface IDriveRevision {
  id: string;
  mimeType?: string;
  modifiedTime?: string;
  keepForever?: boolean;
  published?: boolean;
  lastModifyingUser?: IDriveUser;
}

export interface IDriveFile {
  id: string;
  name: string;
  mimeType: string;
  description?: string;
  starred?: boolean;
  trashed?: boolean;
  parents?: string[];
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  owners?: IDriveUser[];
  lastModifyingUser?: IDriveUser;
  permissions?: IDrivePermission[];
  folderColorRgb?: string;
  shared?: boolean;
  ownedByMe?: boolean;
}

export interface IDriveFileList {
  files: IDriveFile[];
  nextPageToken?: string;
  incompleteSearch?: boolean;
}

export interface ISharedDrive {
  id: string;
  name: string;
  kind?: string;
  colorRgb?: string;
  createdTime?: string;
  capabilities?: Record<string, boolean>;
}

export interface IDriveListOptions {
  query?: string;
  folderId?: string;
  mimeType?: string;
  maxResults?: number;
  pageToken?: string;
  orderBy?: string;
  includeTeamDriveItems?: boolean;
  supportsAllDrives?: boolean;
}
