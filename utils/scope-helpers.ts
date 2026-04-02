/**
 * OAuth scope management helpers for Google services
 */

export const GOOGLE_SCOPES: Record<string, string[]> = {
  profile: [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
  gmail: [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.readonly',
  ],
  gmail_send: [
    'https://www.googleapis.com/auth/gmail.send',
  ],
  gmail_readonly: [
    'https://www.googleapis.com/auth/gmail.readonly',
  ],
  calendar: [
    'https://www.googleapis.com/auth/calendar',
  ],
  calendar_readonly: [
    'https://www.googleapis.com/auth/calendar.readonly',
  ],
  drive: [
    'https://www.googleapis.com/auth/drive',
  ],
  drive_readonly: [
    'https://www.googleapis.com/auth/drive.readonly',
  ],
  drive_file: [
    'https://www.googleapis.com/auth/drive.file',
  ],
  docs: [
    'https://www.googleapis.com/auth/documents',
  ],
  docs_readonly: [
    'https://www.googleapis.com/auth/documents.readonly',
  ],
  sheets: [
    'https://www.googleapis.com/auth/spreadsheets',
  ],
  sheets_readonly: [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
  ],
  contacts: [
    'https://www.googleapis.com/auth/contacts',
  ],
  contacts_readonly: [
    'https://www.googleapis.com/auth/contacts.readonly',
  ],
  contacts_other: [
    'https://www.googleapis.com/auth/contacts.other.readonly',
  ],
  directory: [
    'https://www.googleapis.com/auth/directory.readonly',
  ],
  tasks: [
    'https://www.googleapis.com/auth/tasks',
  ],
  tasks_readonly: [
    'https://www.googleapis.com/auth/tasks.readonly',
  ],
};

/**
 * Get the default minimal scopes (profile + email).
 */
export function getDefaultScopes(): string[] {
  return [...GOOGLE_SCOPES.profile];
}

/**
 * Get the combined scopes for a list of service names.
 */
export function getScopesForServices(services: string[]): string[] {
  const scopeSet = new Set<string>(getDefaultScopes());
  for (const svc of services) {
    const scopes = GOOGLE_SCOPES[svc];
    if (scopes) {
      for (const scope of scopes) {
        scopeSet.add(scope);
      }
    }
  }
  return Array.from(scopeSet);
}

/**
 * Check whether all required scopes are present in the granted set.
 */
export function hasRequiredScopes(granted: string[], required: string[]): boolean {
  const grantedSet = new Set(granted);
  return required.every((scope) => grantedSet.has(scope));
}

/**
 * Return the scopes from required that are NOT in granted.
 */
export function getMissingScopes(granted: string[], required: string[]): string[] {
  const grantedSet = new Set(granted);
  return required.filter((scope) => !grantedSet.has(scope));
}
