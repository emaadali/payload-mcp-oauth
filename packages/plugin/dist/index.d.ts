import { Access, Plugin } from 'payload';
import { MCPPluginConfig } from '@payloadcms/plugin-mcp';

interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}
interface RateLimiter {
    check(key: string): boolean;
}
interface RateLimitOptions {
    register?: Partial<RateLimitConfig>;
    authorize?: Partial<RateLimitConfig>;
    token?: Partial<RateLimitConfig>;
    revoke?: Partial<RateLimitConfig>;
}

interface PayloadMcpOAuthConfig {
    /**
     * The public base URL of the Payload instance (e.g. https://cms.example.com).
     * Used as the OAuth `issuer` and to construct all endpoint URLs in metadata.
     */
    issuer: string;
    /**
     * A reference to the SAME options object passed to `mcpPlugin()`.
     * The OAuth plugin sets `overrideGetAuthorizedMCP` on this reference so that
     * the MCP handler can validate OAuth tokens at request time (Payload 4).
     *
     * ⚠️ This must be the exact same object reference — not a copy, spread, or
     * fresh literal. Assign it to a `const` and pass that same `const` to both
     * `mcpPlugin()` and `payloadMcpOAuth()`:
     *
     * ```ts
     * const mcpOptions: MCPPluginConfig = { collections: { ... } }
     * plugins: [
     *   mcpPlugin(mcpOptions),
     *   payloadMcpOAuth({ issuer, mcpPluginOptions: mcpOptions }),
     * ]
     * ```
     *
     * If you pass a different object, `overrideGetAuthorizedMCP` is installed on an
     * object the MCP handler never sees, and OAuth tokens silently fail to
     * authenticate while the API-key path keeps working.
     */
    mcpPluginOptions: MCPPluginConfig;
    /**
     * Turn the OAuth layer off without uninstalling. When `true` (or when the MCP
     * plugin itself is disabled via `mcpPluginOptions.disabled`), the plugin adds
     * NO endpoints, does NO token-validation wiring, and leaves `mcpPluginOptions`
     * untouched — the MCP server keeps working with API keys only.
     *
     * The OAuth collections are still registered (they're relationally isolated, so
     * this is safe) to keep the database schema consistent for migrations — matching
     * how `@payloadcms/plugin-mcp` and the official plugin template behave.
     *
     * @default false
     */
    disabled?: boolean;
    /**
     * The Payload collection that holds user accounts.
     * @default 'users'
     */
    userCollection?: string;
    /**
     * Access rule deciding who may VIEW and MANAGE the OAuth collections
     * (`oauth-clients`, `oauth-tokens`) in the Payload admin UI and over the
     * Local API. This gates `read`, `update`, and `delete`; `create` is always
     * denied (clients self-register via Dynamic Client Registration and tokens
     * are minted by the token endpoint).
     *
     * The default authorises any authenticated user **belonging to the configured
     * `userCollection`** (`req.user?.collection === userCollection`). For the
     * standard Payload starters — where the `users` collection holds only
     * operators/admins — this is correct and secure: the public/unauthenticated
     * REST + GraphQL surface stays closed.
     *
     * ⚠️ If your `userCollection` mixes admins with untrusted end-users (e.g. a
     * single `users` collection for both staff and customers), supply your own
     * rule here — otherwise any logged-in user could rewrite a client's
     * `redirectUris` (→ auth-code theft) or revoke others' tokens.
     *
     * @default ({ req }) => Boolean(req.user) && req.user.collection === userCollection
     */
    adminAccess?: Access;
    /** Lifetime of issued access tokens in seconds. @default 3600 */
    accessTokenTtlSeconds?: number;
    /** Lifetime of issued refresh tokens in seconds. @default 86400 */
    refreshTokenTtlSeconds?: number;
    /** Lifetime of issued auth codes in seconds. @default 300 */
    authCodeTtlSeconds?: number;
    /** Per-endpoint rate-limit overrides. */
    rateLimits?: RateLimitOptions;
}
interface ResolvedConfig {
    issuer: string;
    mcpPluginOptions: MCPPluginConfig;
    userCollection: string;
    adminAccess: Access;
    accessTokenTtlSeconds: number;
    refreshTokenTtlSeconds: number;
    authCodeTtlSeconds: number;
    rateLimits: RateLimitOptions;
}
declare class PayloadMcpOAuthError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
declare class OAuthInvalidTokenError extends Error {
    constructor();
}

interface AsMetadata {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    registration_endpoint: string;
    revocation_endpoint: string;
    response_types_supported: ['code'];
    grant_types_supported: ['authorization_code', 'refresh_token'];
    code_challenge_methods_supported: ['S256'];
    token_endpoint_auth_methods_supported: ['none'];
}

interface PrmMetadata {
    resource: string;
    authorization_servers: [string];
    bearer_methods_supported: ['header'];
    resource_documentation?: string;
}

/**
 * Payload plugin that adds OAuth 2.1 + PKCE + Dynamic Client Registration
 * to an existing `@payloadcms/plugin-mcp` MCP server.
 *
 * Must be registered AFTER `mcpPlugin()` in the plugins array:
 *
 * ```ts
 * const mcpOptions: MCPPluginConfig = { ... }
 *
 * export default buildConfig({
 *   plugins: [
 *     mcpPlugin(mcpOptions),
 *     payloadMcpOAuth({ issuer: 'https://cms.example.com', mcpPluginOptions: mcpOptions }),
 *   ],
 * })
 * ```
 */
declare function payloadMcpOAuth(options: PayloadMcpOAuthConfig): Plugin;

export { type AsMetadata, OAuthInvalidTokenError, type PayloadMcpOAuthConfig, PayloadMcpOAuthError, type PrmMetadata, type RateLimitConfig, type RateLimitOptions, type RateLimiter, type ResolvedConfig, payloadMcpOAuth };
