import { describe, expect, it, vi, beforeEach } from 'vitest'
import { installOverrideGetAuthorizedMCP, wrapMcpEndpointHandler } from '../../../src/middleware/wrap-mcp.js'
import { OAuthInvalidTokenError } from '../../../src/types.js'
import { UnauthorizedError } from 'payload'
import type { SanitizedMCPPluginConfig } from '@payloadcms/plugin-mcp'

type MCPItem = SanitizedMCPPluginConfig['items'][number]

process.env['PMOAUTH_TOKEN_PEPPER'] = 'test-pepper-32-chars-minimum-length!!'

const TEST_ISSUER = 'https://example.com'
const TEST_PRM_URL = `${TEST_ISSUER}/.well-known/oauth-protected-resource`

const ALL_ITEMS = [
  {
    type: 'collectionTool',
    collectionSlug: 'posts',
    configKey: 'find',
    mcpName: 'findDocuments',
    label: 'find',
    tool: { access: () => true },
  },
  {
    type: 'collectionTool',
    collectionSlug: 'posts',
    configKey: 'create',
    mcpName: 'createDocuments',
    label: 'create',
    tool: { access: () => true },
  },
] as MCPItem[]

vi.mock('@payloadcms/plugin-mcp/internal', () => ({
  filterMCPItems: vi.fn(async ({ items }: { items: MCPItem[] }) => items),
}))

describe('wrapMcpEndpointHandler', () => {
  it('calls the original handler and returns its response', async () => {
    const original = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const wrapped = wrapMcpEndpointHandler(original, TEST_ISSUER)
    const res = await wrapped({} as never)
    expect(original).toHaveBeenCalledOnce()
    expect(res.status).toBe(200)
  })

  it('converts OAuthInvalidTokenError to 401 with WWW-Authenticate header including resource_metadata', async () => {
    const original = vi.fn().mockRejectedValue(new OAuthInvalidTokenError())
    const wrapped = wrapMcpEndpointHandler(original, TEST_ISSUER)
    const res = await wrapped({} as never)
    expect(res.status).toBe(401)
    const www = res.headers.get('WWW-Authenticate') ?? ''
    expect(www).toContain('Bearer error="invalid_token"')
    expect(www).toContain(`resource_metadata="${TEST_PRM_URL}"`)
  })

  it('adds resource_metadata to 401 responses from the underlying handler', async () => {
    const original = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 401,
        headers: { 'WWW-Authenticate': 'Bearer realm="test"' },
      }),
    )
    const wrapped = wrapMcpEndpointHandler(original, TEST_ISSUER)
    const res = await wrapped({} as never)
    expect(res.status).toBe(401)
    const www = res.headers.get('WWW-Authenticate') ?? ''
    expect(www).toContain('Bearer realm="test"')
    expect(www).toContain(`resource_metadata="${TEST_PRM_URL}"`)
  })

  it('adds resource_metadata to bare 401 with no WWW-Authenticate', async () => {
    const original = vi.fn().mockResolvedValue(new Response(null, { status: 401 }))
    const wrapped = wrapMcpEndpointHandler(original, TEST_ISSUER)
    const res = await wrapped({} as never)
    expect(res.status).toBe(401)
    expect(res.headers.get('WWW-Authenticate')).toContain(`resource_metadata="${TEST_PRM_URL}"`)
  })

  it('does not duplicate resource_metadata if already present', async () => {
    const existing = `Bearer resource_metadata="${TEST_PRM_URL}"`
    const original = vi.fn().mockResolvedValue(
      new Response(null, { status: 401, headers: { 'WWW-Authenticate': existing } }),
    )
    const wrapped = wrapMcpEndpointHandler(original, TEST_ISSUER)
    const res = await wrapped({} as never)
    const www = res.headers.get('WWW-Authenticate') ?? ''
    expect(www.split('resource_metadata=').length - 1).toBe(1)
  })

  it('converts Payload UnauthorizedError to 401 with resource_metadata challenge (no error code)', async () => {
    const original = vi.fn().mockRejectedValue(new UnauthorizedError())
    const wrapped = wrapMcpEndpointHandler(original, TEST_ISSUER)
    const res = await wrapped({} as never)
    expect(res.status).toBe(401)
    const www = res.headers.get('WWW-Authenticate') ?? ''
    expect(www).toContain(`resource_metadata="${TEST_PRM_URL}"`)
    expect(www).not.toContain('error=')
  })

  it('rethrows non-OAuth errors', async () => {
    const original = vi.fn().mockRejectedValue(new Error('DB connection failed'))
    const wrapped = wrapMcpEndpointHandler(original, TEST_ISSUER)
    await expect(wrapped({} as never)).rejects.toThrow('DB connection failed')
  })
})

describe('installOverrideGetAuthorizedMCP', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function makePayload(user: unknown = { id: 'user-1', email: 'a@b.com' }) {
    return {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      findByID: vi.fn().mockResolvedValue(user),
      auth: vi.fn().mockResolvedValue({ user }),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }
  }

  function pluginConfig(items: MCPItem[] = ALL_ITEMS) {
    return { items, disabled: false } as never
  }

  it('sets overrideGetAuthorizedMCP on mcpPluginOptions', () => {
    const opts = {} as Parameters<typeof installOverrideGetAuthorizedMCP>[0]
    installOverrideGetAuthorizedMCP(opts, 'users')
    expect(typeof opts.overrideGetAuthorizedMCP).toBe('function')
  })

  it('uses default Payload auth for non-pmoauth tokens', async () => {
    const opts = {} as Parameters<typeof installOverrideGetAuthorizedMCP>[0]
    installOverrideGetAuthorizedMCP(opts, 'users')
    const user = { id: 'u1' }
    const payload = makePayload(user)
    const req = {
      headers: new Headers({ Authorization: 'users API-Key abc123' }),
      payload,
      user: null,
      t: (k: string) => k,
    }
    const result = await opts.overrideGetAuthorizedMCP!({
      overrideAccess: false,
      pluginConfig: pluginConfig(),
      req: req as never,
    })
    expect(payload.auth).toHaveBeenCalledOnce()
    expect(req.user).toEqual(user)
    expect(result.items).toEqual(ALL_ITEMS)
    expect(result.overrideAccess).toBe(false)
  })

  it('uses default auth when no Authorization header', async () => {
    const opts = {} as Parameters<typeof installOverrideGetAuthorizedMCP>[0]
    installOverrideGetAuthorizedMCP(opts, 'users')
    const payload = makePayload(null)
    payload.auth = vi.fn().mockResolvedValue({ user: null })
    const req = {
      headers: new Headers(),
      payload,
      user: null,
      t: (k: string) => k,
    }
    const result = await opts.overrideGetAuthorizedMCP!({
      overrideAccess: false,
      pluginConfig: pluginConfig(),
      req: req as never,
    })
    expect(payload.auth).toHaveBeenCalledOnce()
    expect(result.items).toEqual(ALL_ITEMS)
  })

  it('throws OAuthInvalidTokenError for an unknown pmoauth_ token', async () => {
    const opts = {} as Parameters<typeof installOverrideGetAuthorizedMCP>[0]
    installOverrideGetAuthorizedMCP(opts, 'users')
    const payload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      findByID: vi.fn(),
      auth: vi.fn(),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }
    const req = {
      headers: new Headers({
        Authorization: 'Bearer pmoauth_at_unknowntoken12345678901234567890123',
      }),
      payload,
      user: null,
    }
    await expect(
      opts.overrideGetAuthorizedMCP!({
        overrideAccess: false,
        pluginConfig: pluginConfig(),
        req: req as never,
      }),
    ).rejects.toThrow(OAuthInvalidTokenError)
    expect(payload.auth).not.toHaveBeenCalled()
  })

  it('returns AuthorizedMCP with full items when token stores empty capabilities', async () => {
    const opts = {
      collections: {
        posts: {},
      },
    } as Parameters<typeof installOverrideGetAuthorizedMCP>[0]
    installOverrideGetAuthorizedMCP(opts, 'users')

    const tokenDoc = {
      id: 'tok-1',
      tokenHash: 'anyhash',
      tokenType: 'access',
      userId: 'user-1',
      clientId: 'client-1',
      scope: 'mcp',
      capabilities: {},
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      revokedAt: null,
    }
    const payload = {
      find: vi.fn().mockResolvedValue({ docs: [tokenDoc] }),
      findByID: vi.fn().mockResolvedValue({ id: 'user-1', email: 'a@b.com' }),
      update: vi.fn().mockResolvedValue({}),
      auth: vi.fn(),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }
    const req = {
      headers: new Headers({
        Authorization: 'Bearer pmoauth_at_sometoken12345678901234567890123',
      }),
      payload,
      user: null,
    }
    const result = await opts.overrideGetAuthorizedMCP!({
      overrideAccess: false,
      pluginConfig: pluginConfig(),
      req: req as never,
    })

    expect(req.user).toBeDefined()
    expect((req.user as Record<string, unknown>)['collection']).toBe('users')
    expect((req.user as Record<string, unknown>)['_strategy']).toBe('local-jwt')
    expect(result.items).toEqual(ALL_ITEMS)
    expect(payload.auth).not.toHaveBeenCalled()
  })

  it('narrows items when token stores scoped capabilities', async () => {
    const opts = {} as Parameters<typeof installOverrideGetAuthorizedMCP>[0]
    installOverrideGetAuthorizedMCP(opts, 'users')

    const tokenDoc = {
      id: 'tok-2',
      tokenHash: 'anyhash2',
      tokenType: 'access',
      userId: 'user-2',
      clientId: 'client-1',
      scope: 'posts:read',
      capabilities: { posts: { find: true } },
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      revokedAt: null,
    }
    const payload = {
      find: vi.fn().mockResolvedValue({ docs: [tokenDoc] }),
      findByID: vi.fn().mockResolvedValue({ id: 'user-2', email: 'b@c.com' }),
      update: vi.fn().mockResolvedValue({}),
      auth: vi.fn(),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }
    const req = {
      headers: new Headers({
        Authorization: 'Bearer pmoauth_at_anothertoken1234567890123456789012',
      }),
      payload,
      user: null,
    }
    const result = await opts.overrideGetAuthorizedMCP!({
      overrideAccess: false,
      pluginConfig: pluginConfig(),
      req: req as never,
    })
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({ configKey: 'find', collectionSlug: 'posts' })
  })
})
