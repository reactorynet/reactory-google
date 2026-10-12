import AuthResolver from '../graphql/resolvers/AuthResolver';

/**
 * Regression coverage for the GoogleConnection field resolvers.
 *
 * The GraphQL schema exposes `GoogleConnection.email` and `expiresAt`, but the
 * service contract returns `googleEmail` and (previously) no `expiresAt`. Without
 * field resolvers both came back `null`. These tests assert the resolver map
 * wires the two fields and maps `googleEmail` -> `email`.
 */
describe('reactory-google AuthResolver field resolvers', () => {
  const proto: any = Object.getPrototypeOf(AuthResolver.prototype ?? AuthResolver);

  // Decorators write the resolver map onto the prototype at import time.
  const resolverMap: any =
    (AuthResolver as any).prototype.resolver ?? (AuthResolver as any).resolver;

  it('registers the auth queries and mutations', () => {
    expect(resolverMap).toBeDefined();
    expect(resolverMap.Query.googleConnectionStatus).toBeDefined();
    expect(resolverMap.Query.googleAuthUrl).toBeDefined();
    expect(resolverMap.Mutation.googleDisconnect).toBeDefined();
    expect(resolverMap.Mutation.googleRequestScopes).toBeDefined();
  });

  it('maps GoogleConnection.email from the service googleEmail field', () => {
    const resolveEmail = resolverMap.GoogleConnection.email;
    expect(typeof resolveEmail).toBe('function');
    expect(resolveEmail({ googleEmail: 'user@example.com' })).toBe('user@example.com');
    expect(resolveEmail({ email: 'fallback@example.com' })).toBe('fallback@example.com');
    expect(resolveEmail({})).toBeNull();
  });

  it('surfaces GoogleConnection.expiresAt from the service field', () => {
    const resolveExpiresAt = resolverMap.GoogleConnection.expiresAt;
    expect(typeof resolveExpiresAt).toBe('function');
    const when = new Date('2026-10-09T12:00:00Z');
    expect(resolveExpiresAt({ expiresAt: when })).toBe(when);
    expect(resolveExpiresAt({})).toBeNull();
  });
});
