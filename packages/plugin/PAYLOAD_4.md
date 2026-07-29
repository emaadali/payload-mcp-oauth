# Payload 4 compatibility

This branch adapts `@brainwebuk/payload-plugin-mcp-oauth` for **Payload 4** / `@payloadcms/plugin-mcp@4` (including canaries).

## What changed

| Payload 3 | Payload 4 |
|---|---|
| `overrideAuth` | `overrideGetAuthorizedMCP` |
| Returns `MCPAccessSettings` capability map + `user` | Returns `AuthorizedMCP` (`items` + `overrideAccess`) and sets `req.user` |
| `collections.posts.enabled: { find: true }` | `collections: { posts: {} }` (tools opt-out via `tools.find: false`) |

Non-OAuth requests still use Payload's default auth (`Authorization: users API-Key …` / JWT).

## Install from this fork

```bash
# pnpm (path into the monorepo package)
pnpm add "github:emaadali/payload-mcp-oauth#feat/payload-4-compat&path:packages/plugin"
```

`dist/` is committed on this branch so the GitHub install does not need a local build.

## Config example (Payload 4)

```ts
import type { MCPPluginConfig } from '@payloadcms/plugin-mcp'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { payloadMcpOAuth } from '@brainwebuk/payload-plugin-mcp-oauth'

const mcpOptions: MCPPluginConfig = {
  collections: {
    posts: {},
    media: { tools: { delete: false } },
  },
}

export default buildConfig({
  plugins: [
    mcpPlugin(mcpOptions),
    payloadMcpOAuth({
      issuer: process.env.NEXT_PUBLIC_SERVER_URL!,
      mcpPluginOptions: mcpOptions, // SAME object reference
    }),
  ],
})
```
