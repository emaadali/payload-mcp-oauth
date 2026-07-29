import { NextRequest, NextResponse } from 'next/server';

/**
 * Options for {@link createMcpOAuthMiddleware}.
 *
 * All fields are optional and default to the conventions used by
 * `@payloadcms/plugin-mcp` + this plugin. Override them only if your app
 * uses a non-default Payload API route or MCP endpoint path.
 */
interface McpOAuthMiddlewareOptions {
    /**
     * Payload's API route prefix, matching `config.routes.api`.
     * @default '/api'
     */
    apiRoute?: string;
    /**
     * The MCP streamable-HTTP endpoint path, relative to the host.
     * @default '/api/mcp'
     */
    mcpEndpointPath?: string;
    /**
     * Rewrite bare-host `POST /` requests that look like MCP clients to the MCP
     * endpoint. Lets Claude.ai connectors registered with the bare host URL work
     * without an explicit `/api/mcp` suffix.
     * @default true
     */
    rewriteBareHostMcp?: boolean;
    /**
     * Rewrite the two OAuth discovery documents from the root (where clients
     * fetch them per RFC 8414 / RFC 9728) to Payload's `/api`-mounted endpoints.
     * @default true
     */
    rewriteWellKnown?: boolean;
}
/**
 * Builds a Next.js middleware that wires the host-level routing the OAuth plugin
 * needs but cannot register from inside Payload:
 *
 *  1. `POST /` (MCP-looking) → `<mcpEndpointPath>` so bare-host connectors work.
 *  2. `/.well-known/oauth-authorization-server` → `<apiRoute>/.well-known/...`
 *  3. `/.well-known/oauth-protected-resource`   → `<apiRoute>/.well-known/...`
 *
 * Pair this with the exported {@link config} (a static matcher Next.js can
 * analyse). For the common case, re-export the ready-made {@link mcpOAuthMiddleware}.
 */
declare function createMcpOAuthMiddleware(options?: McpOAuthMiddlewareOptions): (request: NextRequest) => NextResponse;
/**
 * Ready-to-use middleware for the default Payload layout. Re-export it from your
 * project's `middleware.ts` together with {@link config}:
 *
 * ```ts
 * export { mcpOAuthMiddleware as middleware, config } from '@brainwebuk/payload-plugin-mcp-oauth/middleware'
 * ```
 *
 * If you already have a `middleware.ts`, call {@link createMcpOAuthMiddleware}
 * inside it instead and merge the result with your own logic.
 */
declare const mcpOAuthMiddleware: (request: NextRequest) => NextResponse;
/**
 * Static matcher for the paths the middleware acts on. Next.js requires
 * `config.matcher` to be statically analysable, so this MUST stay a string
 * literal (it can't reference OAUTH_DISCOVERY_PATHS). A unit test asserts it
 * stays in sync with those constants.
 */
declare const config: {
    matcher: string[];
};

export { type McpOAuthMiddlewareOptions, config, createMcpOAuthMiddleware, mcpOAuthMiddleware };
