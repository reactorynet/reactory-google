import services from '../services';

/**
 * Regression coverage for the Reactory service-container dependency binding.
 *
 * `ServiceManager.getService` binds every declared dependency alias onto the
 * freshly constructed service instance using one of two strategies:
 *
 *   1. if `svc[`set${Alias}`]` is a function  -> call it with the dependency
 *   2. otherwise                              -> `svc[alias] = dependency`
 *
 * A *getter-only* accessor whose name matches a dependency alias makes strategy 2
 * throw `TypeError: Cannot set property <alias> ... which has only a getter`
 * the moment the service is first activated. Direct unit tests that `new` the
 * service with a mock context bypass `ServiceManager` entirely, so they never
 * exercised this path — which is exactly how the reactory-google services
 * shipped a broken DI binding.
 *
 * This suite simulates the container's binding step for every service the
 * module registers and fails if any alias cannot be bound.
 */
describe('reactory-google service container binding', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: 'mock-client-id.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'mock-client-secret',
      GOOGLE_REDIRECT_URI: 'http://localhost:4000/google/auth/callback',
      GOOGLE_TOKEN_ENCRYPTION_KEY: 'test-master-encryption-key-32-chars-long!',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const buildContext = () => {
    const getService = jest.fn((id: string) => ({ __contextStub: id }));
    return {
      user: { _id: 'user123' },
      getService,
      log: jest.fn(),
      warn: jest.fn(),
    } as any;
  };

  /** Mirror ServiceManager.getService dependency binding for a single service. */
  const bindDependencies = (svc: any, deps: Array<{ id: string; alias?: string }>) => {
    (deps || []).forEach((dep) => {
      const alias: string = dep.alias || dep.id;
      const setterName = `set${alias.substring(0, 1).toUpperCase()}${alias.substring(1)}`;
      const dependency = { __dep: dep.id };

      if (typeof svc[setterName] === 'function') {
        svc[setterName](dependency);
      } else {
        // This is the line that throws when a getter-only accessor shadows the alias.
        svc[alias] = dependency;
      }
    });
  };

  const cases = services.map((def: any) => [def.id, def] as [string, any]);

  it.each(cases)(
    'binds all declared dependencies for %s without throwing',
    (_id, def) => {
      const context = buildContext();
      const svc: any = def.service({} as any, context);
      expect(svc).toBeTruthy();

      expect(() => bindDependencies(svc, def.dependencies || [])).not.toThrow();
    },
  );

  it('does not expose any getter-only accessor that collides with a dependency alias', () => {
    services.forEach((def: any) => {
      const context = buildContext();
      const svc: any = def.service({} as any, context);
      const proto = Object.getPrototypeOf(svc);

      (def.dependencies || []).forEach((dep: any) => {
        const alias: string = dep.alias || dep.id;
        const setterName = `set${alias.substring(0, 1).toUpperCase()}${alias.substring(1)}`;

        // If the service exposes a `set<Alias>` binder the container uses it and a
        // same-named getter-only accessor is fine. Otherwise, a getter-only accessor
        // on the prototype would make the container's `svc[alias] = dep` throw.
        if (typeof svc[setterName] === 'function') return;

        const descriptor = Object.getOwnPropertyDescriptor(proto, alias);
        if (descriptor && descriptor.get && !descriptor.set) {
          throw new Error(
            `${def.id}: dependency alias "${alias}" collides with a getter-only accessor and ` +
            `there is no ${setterName}() binder — the container cannot bind it.`,
          );
        }
      });
    });
  });

  it('binds the injected redis service into GoogleAuthService (used by the OAuth flow)', () => {
    const context = buildContext();
    const def: any = services.find((d: any) => d.id === 'google.GoogleAuthService@1.0.0');
    const svc: any = def.service({} as any, context);

    const injected = { __dep: 'core.RedisService@1.0.0' };
    // Container strategy: the service exposes setRedisService, so the setter is used.
    expect(typeof svc.setRedisService).toBe('function');
    svc.setRedisService(injected);

    expect(svc.redisService).toBe(injected);
  });
});
