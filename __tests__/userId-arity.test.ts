/**
 * Regression test for the service call-arity contract.
 *
 * Every google.* domain service is **userId-first**: the resolvers, macros, CLI and
 * routes all call e.g. `listMessages(userId, options)`. The services previously
 * declared their first parameter as the *resource* (options/calendarId/id), so the
 * userId was silently consumed as that argument and the real parameter was dropped
 * (a Gmail search returned the default 20 messages, ignoring the query).
 *
 * These tests prove the userId is threaded through to
 * `GoogleAuthService.getAuthorizedClient(userId)` — i.e. the authenticated client is
 * built for the user the caller named, not for a stringified options object.
 *
 * `googleapis` is mocked so no network call is made; the point is *which* userId
 * reaches the auth layer.
 */

import { GoogleAuthService } from '../services/GoogleAuthService';

jest.mock('googleapis', () => {
  const resolveList = (data: any) => jest.fn(async () => ({ data }));
  const client = () => ({
    calendarList: { list: resolveList({ items: [] }) },
    calendars: { list: resolveList({ items: [] }) },
    events: { list: resolveList({ items: [] }), instances: resolveList({ items: [] }) },
    freebusy: { query: resolveList({}) },
    files: { list: resolveList({ files: [] }), get: resolveList({}) },
    permissions: { list: resolveList({ permissions: [] }) },
    revisions: { list: resolveList({ revisions: [] }) },
    drives: { list: resolveList({ drives: [] }) },
    spreadsheets: {
      get: resolveList({}),
      values: { get: resolveList({ values: [] }), batchGet: resolveList({ valueRanges: [] }) },
    },
    documents: { get: resolveList({}) },
    people: {
      connections: { list: resolveList({ connections: [] }) },
      get: resolveList({}),
      searchContacts: resolveList({ results: [] }),
      searchDirectoryPeople: resolveList({ people: [] }),
    },
    contactGroups: { list: resolveList({ contactGroups: [] }) },
    otherContacts: { list: resolveList({ otherContacts: [] }) },
    tasklists: { list: resolveList({ items: [] }) },
    tasks: { list: resolveList({ items: [] }) },
    users: { getProfile: resolveList({ emailAddress: 'x@y.z' }), labels: { list: resolveList({ labels: [] }) }, messages: { list: resolveList({ messages: [] }) } },
  });
  return {
    google: {
      calendar: client,
      drive: client,
      sheets: client,
      docs: client,
      people: client,
      tasks: client,
      gmail: client,
    },
  };
});

interface Recorder {
  getAuthorizedClient: jest.Mock;
}

const buildContext = (): { context: any; auth: Recorder } => {
  const auth: Recorder = {
    getAuthorizedClient: jest.fn(async (userId: string) => ({ __authorizedFor: userId })),
  };
  const redis = { get: jest.fn(async () => null), set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) };
  const context: any = {
    user: { _id: 'context-user' },
    getService: jest.fn((id: string) => {
      if (id === 'google.GoogleAuthService@1.0.0') return auth;
      if (id === 'core.RedisService@1.0.0') return redis;
      return null;
    }),
  };
  return { context, auth };
};

describe('google service call-arity contract (userId-first)', () => {
  // Each entry: the service module, a constructor, and a call that must forward
  // the userId to getAuthorizedClient.
  const cases: Array<[string, string, (svc: any) => Promise<unknown>]> = [
    ['Gmail', '../services/GmailService', (s) => s.listMessages('user-abc', { query: 'from:x@y.z' })],
    ['Calendar', '../services/CalendarService', (s) => s.listCalendars('user-abc')],
    ['Calendar(listEvents)', '../services/CalendarService', (s) => s.listEvents('user-abc', 'primary', { timeMin: 'a', timeMax: 'b' })],
    ['Drive', '../services/DriveService', (s) => s.listFiles('user-abc', { query: 'x' })],
    ['Sheets', '../services/SheetsService', (s) => s.getValues('user-abc', 'sheet-id', 'A1:B2')],
    ['Docs', '../services/DocsService', (s) => s.getDocument('user-abc', 'doc-id')],
    ['Contacts', '../services/ContactsService', (s) => s.listContacts('user-abc')],
    ['Tasks', '../services/TasksService', (s) => s.listTaskLists('user-abc')],
  ];

  it.each(cases)('%s forwards the caller userId to getAuthorizedClient', async (_label, modulePath, invoke) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(modulePath);
    const ServiceClass = mod[Object.keys(mod).find((k) => typeof mod[k] === 'function') as string];

    const { context, auth } = buildContext();
    const svc = new ServiceClass({}, context);

    await invoke(svc);

    expect(auth.getAuthorizedClient).toHaveBeenCalledWith('user-abc');
  });
});
