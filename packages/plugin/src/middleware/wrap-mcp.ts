import type { AuthorizedMCP, MCPPluginConfig, SanitizedMCPPluginConfig } from '@payloadcms/plugin-mcp'
import { filterMCPItems } from '@payloadcms/plugin-mcp/internal'
import type { AuthenticatedUser, PayloadRequest } from 'payload'
import { UnauthorizedError } from 'payload'
import { validateAccessToken } from '../lib/validate.js'
import { filterItemsByCapabilities } from '../lib/scope.js'
import { OAUTH_PRM_METADATA_PATH } from '../lib/paths.js'
import { OAuthInvalidTokenError } from '../types.js'

/**
 * Installs `overrideGetAuthorizedMCP` on the shared MCP plugin options reference
 * (Payload 4). When the Bearer token starts with `pmoauth_`, the OAuth validation
 * path runs; otherwise the default Payload auth path (API keys / JWT) is used.
 *
 * The handler wrapper ({@link wrapMcpEndpointHandler}) must be applied to the MCP
 * endpoint so that {@link OAuthInvalidTokenError} thrown here is converted to a 401.
 */
export function installOverrideGetAuthorizedMCP(
  mcpPluginOptions: MCPPluginConfig,
  userCollection: string,
): void {
  mcpPluginOptions.overrideGetAuthorizedMCP = async ({
    overrideAccess,
    pluginConfig,
    req,
  }): Promise<AuthorizedMCP> => {
    const bearer = req.headers.get?.('Authorization')?.replace(/^Bearer\s+/i, '')

    if (!bearer?.startsWith('pmoauth_')) {
      return defaultAuthorize({ overrideAccess, pluginConfig, req })
    }

    req.payload.logger?.info(
      `[pmoauth] overrideGetAuthorizedMCP: validating token prefix=${bearer.slice(0, 18)}`,
    )

    const ctx = await validateAccessToken(req.payload, bearer)
    if (!ctx) {
      req.payload.logger?.warn(
        '[pmoauth] overrideGetAuthorizedMCP: validateAccessToken returned null — token not found/expired/revoked',
      )
      throw new OAuthInvalidTokenError()
    }

    req.payload.logger?.info(
      `[pmoauth] overrideGetAuthorizedMCP: token valid, userId=${ctx.userId}, fetching user`,
    )

    let user
    try {
      user = await req.payload.findByID({
        collection: userCollection,
        overrideAccess: true,
        id: ctx.userId,
      })
    } catch (err) {
      req.payload.logger?.error(
        `[pmoauth] overrideGetAuthorizedMCP: findByID failed for userId=${ctx.userId}: ${String(err)}`,
      )
      throw new OAuthInvalidTokenError()
    }

    if (!user) {
      req.payload.logger?.warn(
        `[pmoauth] overrideGetAuthorizedMCP: user not found for userId=${ctx.userId}`,
      )
      throw new OAuthInvalidTokenError()
    }

    // Set collection/strategy metadata so Payload's access-control layer recognises the user,
    // matching what the API-key / JWT strategies set on AuthenticatedUser.
    const authenticated = user as AuthenticatedUser & Record<string, unknown>
    authenticated['collection'] = userCollection
    authenticated['_strategy'] = 'local-jwt'
    req.user = authenticated

    req.payload.logger?.info('[pmoauth] overrideGetAuthorizedMCP: success, filtering MCP items')

    let items = await filterMCPItems({
      items: pluginConfig.items,
      overrideAccess,
      req,
    })

    // Empty capabilities = full operator grant (all items the user may access).
    // Non-empty = OAuth scope narrowing applied at consent/token time.
    if (Object.keys(ctx.capabilities).length > 0) {
      items = filterItemsByCapabilities(items, ctx.capabilities)
    }

    return { items, overrideAccess }
  }
}

/** @deprecated Use {@link installOverrideGetAuthorizedMCP}. Kept as an alias for older call sites. */
export const installOverrideAuth = installOverrideGetAuthorizedMCP

/**
 * Replicates Payload 4's default MCP auth path so API keys / JWT keep working
 * when our override is installed (the override fully replaces the default).
 */
async function defaultAuthorize({
  overrideAccess,
  pluginConfig,
  req,
}: {
  overrideAccess: boolean
  pluginConfig: SanitizedMCPPluginConfig
  req: PayloadRequest
}): Promise<AuthorizedMCP> {
  if (req.headers) {
    const headers = new Headers(req.headers)
    const hasAuthorization = headers.has('Authorization')
    headers.set('DisableAutologin', 'true')
    req.user = (
      await req.payload.auth({
        headers,
        req,
      })
    ).user

    if (hasAuthorization && !req.user) {
      throw new UnauthorizedError(req.t)
    }
  }

  return {
    items: await filterMCPItems({
      items: pluginConfig.items,
      overrideAccess,
      req,
    }),
    overrideAccess,
  }
}

/**
 * Wraps a PayloadHandler so that:
 * - OAuthInvalidTokenError thrown by overrideGetAuthorizedMCP is converted to a spec-compliant 401
 * - Any 401 from the underlying MCP handler gets resource_metadata appended to
 *   WWW-Authenticate per RFC 9728, enabling client AS discovery
 */
export function wrapMcpEndpointHandler(
  original: (req: PayloadRequest) => Promise<Response> | Response,
  issuer: string,
  canonicalPathname?: string,
): (req: PayloadRequest) => Promise<Response> {
  const prmUrl = `${issuer.replace(/\/$/, '')}${OAUTH_PRM_METADATA_PATH}`

  function addResourceMetadata(wwwAuth: string | null): string {
    const resourceMeta = `resource_metadata="${prmUrl}"`
    if (!wwwAuth) return `Bearer ${resourceMeta}`
    if (wwwAuth.includes('resource_metadata=')) return wwwAuth
    return `${wwwAuth}, ${resourceMeta}`
  }

  return async (req) => {
    // After a Next.js middleware rewrite (e.g. POST / → /api/mcp), Payload's
    // routing matches but req.url still has the original pathname. The MCP
    // handler downstream does `url.pathname === '/api/mcp'` and returns 404
    // if it doesn't match. Wrap req in a Proxy that overrides `url` so the
    // rewritten request behaves identically to a direct hit on the endpoint.
    let effectiveReq = req
    if (canonicalPathname && req.url) {
      try {
        const u = new URL(req.url)
        if (u.pathname !== canonicalPathname) {
          u.pathname = canonicalPathname
          const patchedUrl = u.toString()
          effectiveReq = new Proxy(req, {
            get(target, prop, receiver) {
              if (prop === 'url') return patchedUrl
              return Reflect.get(target, prop, receiver)
            },
          })
        }
      } catch {
        // req.url not absolute — leave as-is
      }
    }
    try {
      const res = await original(effectiveReq)
      if (res.status === 401) {
        const headers = new Headers(res.headers)
        headers.set('WWW-Authenticate', addResourceMetadata(res.headers.get('WWW-Authenticate')))
        return new Response(res.body, { status: 401, statusText: res.statusText, headers })
      }
      return res
    } catch (err) {
      if (err instanceof OAuthInvalidTokenError) {
        return new Response(null, {
          status: 401,
          headers: {
            'WWW-Authenticate': `Bearer error="invalid_token", error_description="OAuth token is invalid or expired", resource_metadata="${prmUrl}"`,
            'Cache-Control': 'no-store',
          },
        })
      }
      // Payload's MCP handler throws UnauthorizedError when there is no Bearer token or the
      // API-key path finds nothing. Catch it here so we can return a proper OAuth challenge
      // with resource_metadata, enabling the client to discover the authorization server.
      if (err instanceof UnauthorizedError) {
        return new Response(null, {
          status: 401,
          headers: {
            'WWW-Authenticate': `Bearer resource_metadata="${prmUrl}"`,
            'Cache-Control': 'no-store',
          },
        })
      }
      throw err
    }
  }
}
