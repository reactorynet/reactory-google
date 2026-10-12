import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, query, mutation, property } from '@reactory/server-core/models/graphql/decorators/resolver';

@resolver
class AuthResolver {
  resolver: any;

  @roles(['USER'], 'args.context')
  @query('googleConnectionStatus')
  async getConnectionStatus(
    _obj: any,
    _params: Record<string, unknown>,
    context: Reactory.Server.IReactoryContext,
  ) {
    const authService = context.getService('google.GoogleAuthService@1.0.0') as any;
    if (!authService) throw new Error('Google Auth Service not available');
    return authService.getConnectionStatus(String(context.user._id));
  }

  @roles(['USER'], 'args.context')
  @query('googleAuthUrl')
  async getAuthUrl(
    _obj: any,
    params: { scopes?: string[] },
    context: Reactory.Server.IReactoryContext,
  ) {
    const authService = context.getService('google.GoogleAuthService@1.0.0') as any;
    if (!authService) throw new Error('Google Auth Service not available');
    const url = await authService.getAuthorizationUrl(
      String(context.user._id),
      params.scopes || [],
    );
    return { url };
  }

  @roles(['USER'], 'args.context')
  @mutation('googleDisconnect')
  async disconnect(
    _obj: any,
    _params: Record<string, unknown>,
    context: Reactory.Server.IReactoryContext,
  ) {
    const authService = context.getService('google.GoogleAuthService@1.0.0') as any;
    if (!authService) throw new Error('Google Auth Service not available');
    await authService.revokeAccess(String(context.user._id));
    return true;
  }

  @roles(['USER'], 'args.context')
  @mutation('googleRequestScopes')
  async requestScopes(
    _obj: any,
    params: { scopes: string[] },
    context: Reactory.Server.IReactoryContext,
  ) {
    const authService = context.getService('google.GoogleAuthService@1.0.0') as any;
    if (!authService) throw new Error('Google Auth Service not available');
    const url = await authService.requestAdditionalScopes(
      String(context.user._id),
      params.scopes,
    );
    return { url };
  }

  /**
   * Field resolver — the schema exposes `GoogleConnection.email`, but the service
   * contract returns `googleEmail`. Map between them so the connect form shows
   * the connected account's address instead of `null`.
   */
  @property('GoogleConnection', 'email')
  resolveEmail(obj: any): string | null {
    return obj?.googleEmail ?? obj?.email ?? null;
  }

  /**
   * Field resolver — surface the access-token expiry (the service returns
   * `expiresAt` for connected / expired / revoked tokens).
   */
  @property('GoogleConnection', 'expiresAt')
  resolveExpiresAt(obj: any): Date | null {
    return obj?.expiresAt ?? null;
  }
}

export default AuthResolver;
