import { describe, expect, it } from 'vitest'
import {
  toCamelCase,
  buildFullCapabilities,
  scopeToCapabilities,
  filterItemsByCapabilities,
} from '../../../src/lib/scope.js'
import type { MCPPluginConfig, SanitizedMCPPluginConfig } from '@payloadcms/plugin-mcp'

type MCPItem = SanitizedMCPPluginConfig['items'][number]

/** Payload 3-shaped fixtures (still supported for scope resolution). */
const MCP_OPTIONS_V3: MCPPluginConfig = {
  collections: {
    posts: { enabled: true } as never,
    media: { enabled: { find: true, create: true } } as never,
    'read-only': { enabled: { find: true } } as never,
    'blog-posts': { enabled: true } as never,
  },
  globals: {
    settings: { enabled: true } as never,
    'site-config': { enabled: { find: true } } as never,
  },
}

/** Payload 4-shaped fixtures (opt-out tools). */
const MCP_OPTIONS_V4: MCPPluginConfig = {
  collections: {
    posts: {},
    media: { tools: { update: false, delete: false } },
    'read-only': { tools: { create: false, update: false, delete: false } },
    'blog-posts': {},
  },
  globals: {
    settings: {},
    'site-config': { tools: { update: false } },
  },
}

describe('toCamelCase', () => {
  it('leaves simple slugs unchanged', () => {
    expect(toCamelCase('posts')).toBe('posts')
  })

  it('converts hyphenated slugs to camelCase', () => {
    expect(toCamelCase('blog-posts')).toBe('blogPosts')
    expect(toCamelCase('site-config')).toBe('siteConfig')
  })
})

describe('buildFullCapabilities — Payload 3 enabled shape', () => {
  it('grants full ops for collections with enabled: true', () => {
    const caps = buildFullCapabilities(MCP_OPTIONS_V3)
    expect(caps['posts']).toEqual({ find: true, create: true, update: true, delete: true })
  })

  it('spreads partial object capabilities for collections', () => {
    const caps = buildFullCapabilities(MCP_OPTIONS_V3)
    expect(caps['media']).toEqual({ find: true, create: true })
  })

  it('grants full ops for globals with enabled: true', () => {
    const caps = buildFullCapabilities(MCP_OPTIONS_V3)
    expect(caps['settings']).toEqual({ find: true, update: true })
  })

  it('uses camelCase key for hyphenated slugs', () => {
    const caps = buildFullCapabilities(MCP_OPTIONS_V3)
    expect(caps['blogPosts']).toEqual({ find: true, create: true, update: true, delete: true })
  })

  it('ignores nullish or missing entries', () => {
    const caps = buildFullCapabilities({ collections: { absent: null as never } })
    expect(caps['absent']).toBeUndefined()
  })
})

describe('buildFullCapabilities — Payload 4 tools shape', () => {
  it('grants full ops for collections listed as {}', () => {
    const caps = buildFullCapabilities(MCP_OPTIONS_V4)
    expect(caps['posts']).toEqual({ find: true, create: true, update: true, delete: true })
  })

  it('honours tools.* === false opt-outs', () => {
    const caps = buildFullCapabilities(MCP_OPTIONS_V4)
    expect(caps['media']).toEqual({ find: true, create: true, update: false, delete: false })
    expect(caps['readOnly']).toEqual({ find: true, create: false, update: false, delete: false })
  })
})

describe('scopeToCapabilities — empty scope', () => {
  it('returns valid with empty capabilities for empty string (full-grant fallback)', () => {
    const r = scopeToCapabilities('', MCP_OPTIONS_V4)
    expect(r.valid).toBe(true)
    expect(r.capabilities).toEqual({})
  })

  it('returns valid with empty capabilities for whitespace-only scope', () => {
    expect(scopeToCapabilities('   ', MCP_OPTIONS_V4).valid).toBe(true)
  })
})

describe('scopeToCapabilities — collection scopes (Payload 4)', () => {
  it('maps posts:read → find', () => {
    const r = scopeToCapabilities('posts:read', MCP_OPTIONS_V4)
    expect(r.valid).toBe(true)
    expect(r.capabilities['posts']).toEqual({ find: true })
  })

  it('maps posts:write → create+update', () => {
    const r = scopeToCapabilities('posts:write', MCP_OPTIONS_V4)
    expect(r.valid).toBe(true)
    expect(r.capabilities['posts']).toEqual({ create: true, update: true })
  })

  it('maps posts:delete → delete', () => {
    const r = scopeToCapabilities('posts:delete', MCP_OPTIONS_V4)
    expect(r.valid).toBe(true)
    expect(r.capabilities['posts']).toEqual({ delete: true })
  })

  it('rejects write when update/create are disabled', () => {
    const r = scopeToCapabilities('media:write', MCP_OPTIONS_V4)
    expect(r.valid).toBe(false)
    expect(r.capabilities).toEqual({})
  })

  it('rejects write on read-only collection', () => {
    const r = scopeToCapabilities('read-only:write', MCP_OPTIONS_V4)
    expect(r.valid).toBe(false)
  })

  it('uses camelCase key for hyphenated slugs', () => {
    const r = scopeToCapabilities('blog-posts:read', MCP_OPTIONS_V4)
    expect(r.valid).toBe(true)
    expect(r.capabilities['blogPosts']).toEqual({ find: true })
  })
})

describe('scopeToCapabilities — global scopes', () => {
  it('maps settings:read → find', () => {
    const r = scopeToCapabilities('settings:read', MCP_OPTIONS_V4)
    expect(r.valid).toBe(true)
    expect(r.capabilities['settings']).toEqual({ find: true })
  })

  it('maps settings:write → update', () => {
    const r = scopeToCapabilities('settings:write', MCP_OPTIONS_V4)
    expect(r.valid).toBe(true)
    expect(r.capabilities['settings']).toEqual({ update: true })
  })

  it('rejects delete on globals', () => {
    const r = scopeToCapabilities('settings:delete', MCP_OPTIONS_V4)
    expect(r.valid).toBe(false)
  })

  it('rejects write when global update is disabled', () => {
    const r = scopeToCapabilities('site-config:write', MCP_OPTIONS_V4)
    expect(r.valid).toBe(false)
  })
})

describe('scopeToCapabilities — multi-token scopes', () => {
  it('combines capabilities across multiple tokens for the same slug', () => {
    const r = scopeToCapabilities('posts:read posts:delete', MCP_OPTIONS_V4)
    expect(r.valid).toBe(true)
    expect(r.capabilities['posts']).toEqual({ find: true, delete: true })
  })

  it('combines capabilities across different slugs', () => {
    const r = scopeToCapabilities('posts:read settings:write', MCP_OPTIONS_V4)
    expect(r.valid).toBe(true)
    expect(r.capabilities['posts']).toEqual({ find: true })
    expect(r.capabilities['settings']).toEqual({ update: true })
  })

  it('rejects entire grant when any token is invalid', () => {
    const r = scopeToCapabilities('posts:read unknown:read', MCP_OPTIONS_V4)
    expect(r.valid).toBe(false)
    expect(r.capabilities).toEqual({})
  })
})

describe('scopeToCapabilities — invalid tokens', () => {
  it('rejects bare tokens without colon', () => {
    expect(scopeToCapabilities('openid', MCP_OPTIONS_V4).valid).toBe(false)
    expect(scopeToCapabilities('mcp', MCP_OPTIONS_V4).valid).toBe(false)
  })

  it('rejects trailing/leading colon', () => {
    expect(scopeToCapabilities('posts:', MCP_OPTIONS_V4).valid).toBe(false)
    expect(scopeToCapabilities(':read', MCP_OPTIONS_V4).valid).toBe(false)
  })

  it('rejects unknown slug', () => {
    expect(scopeToCapabilities('nonexistent:read', MCP_OPTIONS_V4).valid).toBe(false)
  })

  it('rejects unknown ops', () => {
    expect(scopeToCapabilities('posts:list', MCP_OPTIONS_V4).valid).toBe(false)
    expect(scopeToCapabilities('posts:admin', MCP_OPTIONS_V4).valid).toBe(false)
  })

  it('never widens: invalid scope always returns empty capabilities', () => {
    const r = scopeToCapabilities('posts:read evil:all', MCP_OPTIONS_V4)
    expect(r.valid).toBe(false)
    expect(r.capabilities).toEqual({})
  })
})

describe('filterItemsByCapabilities', () => {
  const items = [
    { type: 'tool', configKey: 'getConfigInfo', mcpName: 'getConfigInfo', label: 'info' },
    {
      type: 'collectionTool',
      collectionSlug: 'posts',
      configKey: 'find',
      mcpName: 'findDocuments',
      label: 'find',
      tool: {} as never,
    },
    {
      type: 'collectionTool',
      collectionSlug: 'posts',
      configKey: 'create',
      mcpName: 'createDocuments',
      label: 'create',
      tool: {} as never,
    },
    {
      type: 'collectionTool',
      collectionSlug: 'media',
      configKey: 'find',
      mcpName: 'findDocuments',
      label: 'find',
      tool: {} as never,
    },
  ] as MCPItem[]

  it('returns all items when capabilities are empty (full grant)', () => {
    expect(filterItemsByCapabilities(items, {})).toEqual(items)
  })

  it('narrows to find tools + getConfigInfo for posts:read-shaped caps', () => {
    const filtered = filterItemsByCapabilities(items, { posts: { find: true } })
    expect(filtered.map((i) => ('configKey' in i ? i.configKey : ''))).toEqual([
      'getConfigInfo',
      'find',
    ])
  })
})
