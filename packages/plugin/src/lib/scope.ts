import type { MCPPluginConfig, SanitizedMCPPluginConfig } from '@payloadcms/plugin-mcp'

/** Item entry from sanitized MCP config (not re-exported by the package root). */
type MCPItem = SanitizedMCPPluginConfig['items'][number]

export function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, chr: string) => (chr ? chr.toUpperCase() : ''))
    .replace(/^(.)/, (_, chr: string) => chr.toLowerCase())
}

type OpsMap = Record<string, boolean>

/**
 * Resolve the operator-enabled CRUD ops for a collection entry in MCPPluginConfig.
 *
 * Supports both:
 * - Payload 3: `{ enabled: true | { find, create, update, delete } }`
 * - Payload 4: `{ tools?: { find?: false | … } }` — presence in `collections` is the
 *   OAuth allowlist; `tools.<op> === false` disables that op (Payload 4 defaults are opt-out).
 */
export function resolveCollectionOps(cfg: unknown): OpsMap | null {
  if (!cfg || typeof cfg !== 'object') return null
  const c = cfg as Record<string, unknown>

  if ('enabled' in c) {
    if (c.enabled === true) return { find: true, create: true, update: true, delete: true }
    if (c.enabled && typeof c.enabled === 'object') return { ...(c.enabled as OpsMap) }
    return null
  }

  const tools = (c.tools as Record<string, unknown> | undefined) ?? {}
  return {
    find: tools.find !== false,
    create: tools.create !== false,
    update: tools.update !== false,
    delete: tools.delete !== false,
  }
}

/** Same as {@link resolveCollectionOps} for globals (`find` / `update` only). */
export function resolveGlobalOps(cfg: unknown): OpsMap | null {
  if (!cfg || typeof cfg !== 'object') return null
  const c = cfg as Record<string, unknown>

  if ('enabled' in c) {
    if (c.enabled === true) return { find: true, update: true }
    if (c.enabled && typeof c.enabled === 'object') return { ...(c.enabled as OpsMap) }
    return null
  }

  const tools = (c.tools as Record<string, unknown> | undefined) ?? {}
  return {
    find: tools.find !== false,
    update: tools.update !== false,
  }
}

/**
 * Derives the full set of OAuth capability flags from the operator MCP config.
 * Used when documenting grants; empty-scope tokens store `{}` and get a full
 * `pluginConfig.items` grant at request time instead.
 */
export function buildFullCapabilities(mcpPluginOptions: MCPPluginConfig): Record<string, unknown> {
  const caps: Record<string, unknown> = {}

  for (const [slug, cfg] of Object.entries(mcpPluginOptions.collections ?? {})) {
    const ops = resolveCollectionOps(cfg)
    if (!ops) continue
    caps[toCamelCase(slug)] = ops
  }

  for (const [slug, cfg] of Object.entries(mcpPluginOptions.globals ?? {})) {
    const ops = resolveGlobalOps(cfg)
    if (!ops) continue
    caps[toCamelCase(slug)] = ops
  }

  return caps
}

export interface ScopeResult {
  valid: boolean
  invalidScopes: string[]
  capabilities: Record<string, unknown>
}

/**
 * Maps an OAuth scope string to narrowed MCP capabilities.
 *
 * Scope token format: `<collectionSlug>:<op>` or `<globalSlug>:<op>`
 *   read   → { find: true }
 *   write  → collections: { create: true, update: true }; globals: { update: true }
 *   delete → collections only: { delete: true }
 *
 * All requested operations must be enabled on the server — no partial grants.
 * An unknown slug, unknown operation, or disabled operation returns invalid_scope.
 *
 * Empty/absent scope returns valid=true with empty capabilities so the caller
 * (or the wrap-mcp fallback) applies the full operator grant.
 */
export function scopeToCapabilities(
  scope: string,
  mcpPluginOptions: MCPPluginConfig,
): ScopeResult {
  const tokens = scope.trim().split(/\s+/).filter(Boolean)

  if (tokens.length === 0) {
    return { valid: true, invalidScopes: [], capabilities: {} }
  }

  const invalidScopes: string[] = []
  const capabilities: Record<string, OpsMap> = {}

  for (const token of tokens) {
    const colon = token.indexOf(':')
    if (colon <= 0 || colon === token.length - 1) {
      invalidScopes.push(token)
      continue
    }

    const slug = token.slice(0, colon)
    const op = token.slice(colon + 1)
    const key = toCamelCase(slug)

    const colOps = resolveCollectionOps(mcpPluginOptions.collections?.[slug])
    if (colOps) {
      const requestedOps = collectionOpsFor(op)
      if (!requestedOps) {
        invalidScopes.push(token)
        continue
      }
      if (!Object.entries(requestedOps).every(([k, v]) => !v || colOps[k])) {
        invalidScopes.push(token)
        continue
      }
      capabilities[key] = { ...(capabilities[key] ?? {}), ...requestedOps }
      continue
    }

    const globOps = resolveGlobalOps(mcpPluginOptions.globals?.[slug])
    if (globOps) {
      const requestedOps = globalOpsFor(op)
      if (!requestedOps) {
        invalidScopes.push(token)
        continue
      }
      if (!Object.entries(requestedOps).every(([k, v]) => !v || globOps[k])) {
        invalidScopes.push(token)
        continue
      }
      capabilities[key] = { ...(capabilities[key] ?? {}), ...requestedOps }
      continue
    }

    invalidScopes.push(token)
  }

  if (invalidScopes.length > 0) {
    return { valid: false, invalidScopes, capabilities: {} }
  }
  return { valid: true, invalidScopes: [], capabilities: capabilities as Record<string, unknown> }
}

/**
 * Narrow sanitized MCP items to those allowed by a stored capabilities map.
 * Empty capabilities = full grant (return items unchanged).
 */
export function filterItemsByCapabilities(
  items: MCPItem[],
  capabilities: Record<string, unknown>,
): MCPItem[] {
  if (Object.keys(capabilities).length === 0) return items

  return items.filter((item) => {
    if (item.type === 'tool') {
      // Always keep server discovery when any scoped grant exists.
      return item.configKey === 'getConfigInfo'
    }
    if (item.type === 'prompt' || item.type === 'resource') {
      return false
    }

    if (item.type === 'collectionTool') {
      const caps = lookupCaps(capabilities, item.collectionSlug)
      if (!caps) return false
      return isCollectionToolAllowed(item.configKey, caps)
    }

    if (item.type === 'globalTool') {
      const caps = lookupCaps(capabilities, item.globalSlug)
      if (!caps) return false
      return isGlobalToolAllowed(item.configKey, caps)
    }

    return false
  })
}

function lookupCaps(
  capabilities: Record<string, unknown>,
  slug: string,
): OpsMap | null {
  const direct = capabilities[slug]
  if (direct && typeof direct === 'object') return direct as OpsMap
  const camel = capabilities[toCamelCase(slug)]
  if (camel && typeof camel === 'object') return camel as OpsMap
  return null
}

/** Map Payload 4 collection builtin configKeys → OAuth CRUD ops. */
function isCollectionToolAllowed(configKey: string, caps: OpsMap): boolean {
  switch (configKey) {
    case 'find':
    case 'findDistinct':
    case 'count':
    case 'getCollectionSchema':
    case 'findVersions':
    case 'findVersionByID':
    case 'countVersions':
      return Boolean(caps.find)
    case 'create':
    case 'duplicate':
    case 'getUploadInstructions':
      return Boolean(caps.create)
    case 'update':
    case 'restoreVersion':
      return Boolean(caps.update)
    case 'delete':
      return Boolean(caps.delete)
    default:
      // Auth builtins / custom tools are not part of the OAuth scope vocabulary.
      return false
  }
}

function isGlobalToolAllowed(configKey: string, caps: OpsMap): boolean {
  switch (configKey) {
    case 'find':
    case 'getGlobalSchema':
    case 'findVersions':
    case 'findVersionByID':
    case 'countVersions':
      return Boolean(caps.find)
    case 'update':
    case 'restoreVersion':
      return Boolean(caps.update)
    default:
      return false
  }
}

function collectionOpsFor(op: string): OpsMap | null {
  if (op === 'read') return { find: true }
  if (op === 'write') return { create: true, update: true }
  if (op === 'delete') return { delete: true }
  return null
}

function globalOpsFor(op: string): OpsMap | null {
  if (op === 'read') return { find: true }
  if (op === 'write') return { update: true }
  return null
}
