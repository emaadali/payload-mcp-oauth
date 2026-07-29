import {
  OAUTH_AS_METADATA_PATH,
  OAUTH_PRM_METADATA_PATH
} from "./chunk-V7W6RYWW.js";
import {
  __require
} from "./chunk-DGUM43GV.js";

// src/collections/auth-codes.ts
var denyPublicAccess = () => false;
var sweepExpiredCodes = async ({ operation, req }) => {
  if (operation !== "create") return;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const expired = await req.payload.find({
    collection: "oauth-auth-codes",
    overrideAccess: true,
    where: { expiresAt: { less_than: now } },
    limit: 200,
    pagination: false,
    req
  });
  const consumed = await req.payload.find({
    collection: "oauth-auth-codes",
    overrideAccess: true,
    where: { consumedAt: { exists: true } },
    limit: 200,
    pagination: false,
    req
  });
  const toDelete = [
    .../* @__PURE__ */ new Set([
      ...expired.docs.map((d) => d.id),
      ...consumed.docs.map((d) => d.id)
    ])
  ];
  await Promise.all(
    toDelete.map(
      (id) => req.payload.delete({ collection: "oauth-auth-codes", overrideAccess: true, id, req }).catch((err) => {
        req.payload.logger?.warn(`[pmoauth] sweepExpiredCodes: failed to delete id=${id}: ${String(err)}`);
      })
    )
  );
};
var oauthAuthCodesCollection = {
  slug: "oauth-auth-codes",
  // Server-managed — opt out of document-locking so no FK column is added to
  // payload_locked_documents_rels (avoids the SQLite push rebuild bug; see clients.ts).
  lockDocuments: false,
  // Payload 4 defaults versions: true; these tables are ephemeral server state.
  versions: false,
  admin: {
    hidden: true
  },
  access: {
    create: denyPublicAccess,
    read: denyPublicAccess,
    update: denyPublicAccess,
    delete: denyPublicAccess
  },
  timestamps: false,
  hooks: {
    afterChange: [sweepExpiredCodes]
  },
  fields: [
    {
      name: "codeHash",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: "HMAC-SHA-256 hash of the authorization code plaintext."
      }
    },
    {
      name: "clientId",
      type: "text",
      required: true,
      index: true,
      admin: { readOnly: true }
    },
    {
      name: "userId",
      type: "text",
      required: true,
      index: true,
      admin: { readOnly: true }
    },
    {
      name: "redirectUri",
      type: "text",
      required: true,
      admin: { readOnly: true }
    },
    {
      name: "scope",
      type: "text",
      admin: { readOnly: true }
    },
    {
      name: "codeChallenge",
      type: "text",
      required: true,
      admin: { readOnly: true }
    },
    {
      name: "codeChallengeMethod",
      type: "select",
      required: true,
      defaultValue: "S256",
      admin: { readOnly: true },
      options: [{ label: "S256", value: "S256" }]
    },
    {
      name: "expiresAt",
      type: "date",
      required: true,
      index: true,
      admin: { readOnly: true }
    },
    {
      name: "consumedAt",
      type: "date",
      admin: {
        readOnly: true,
        description: "Set when the code is exchanged. Null means it has not been used."
      }
    }
  ],
  labels: {
    singular: "Auth Code",
    plural: "Auth Codes"
  }
};

// src/collections/clients.ts
var denyPublicAccess2 = () => false;
var oauthClientsCollection = {
  slug: "oauth-clients",
  // Server-managed collection — opt out of Payload document-locking. This also
  // removes its polymorphic FK column from `payload_locked_documents_rels`, so
  // installing the plugin doesn't force a rebuild of that table. On SQLite dev
  // push, that rebuild's INSERT…SELECT references the not-yet-existing new
  // columns and fails with `no such column: oauth_clients_id` when the plugin is
  // added to an already-pushed DB. (Payload uses this same opt-out for its own
  // system collections.)
  lockDocuments: false,
  // Payload 4 defaults versions: true; clients are not versioned content.
  versions: false,
  admin: {
    useAsTitle: "clientName",
    group: "MCP",
    defaultColumns: ["clientName", "isActive", "lastUsedAt", "clientId"],
    description: "Apps connected via OAuth. Claude Desktop registers itself automatically \u2014 you only need this screen to review or deactivate connections."
  },
  access: {
    create: denyPublicAccess2,
    read: denyPublicAccess2,
    update: denyPublicAccess2,
    delete: denyPublicAccess2
  },
  timestamps: true,
  fields: [
    {
      name: "clientId",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: "UUID assigned at registration. Immutable."
      }
    },
    {
      name: "clientName",
      type: "text",
      admin: {
        description: "Human-readable name shown on the consent screen."
      }
    },
    {
      name: "redirectUris",
      type: "array",
      required: true,
      minRows: 1,
      admin: {
        description: "Allowed redirect URIs. Exact-match enforced on every authorize request."
      },
      fields: [
        {
          name: "uri",
          type: "text",
          required: true
        }
      ]
    },
    {
      name: "grantTypes",
      type: "select",
      hasMany: true,
      defaultValue: ["authorization_code", "refresh_token"],
      admin: { hidden: true },
      options: [
        { label: "Authorization Code", value: "authorization_code" },
        { label: "Refresh Token", value: "refresh_token" }
      ]
    },
    {
      name: "responseTypes",
      type: "select",
      hasMany: true,
      defaultValue: ["code"],
      admin: { hidden: true },
      options: [{ label: "Code", value: "code" }]
    },
    {
      name: "tokenEndpointAuthMethod",
      type: "select",
      defaultValue: "none",
      admin: { hidden: true },
      options: [{ label: "None (public client)", value: "none" }]
    },
    {
      name: "softwareId",
      type: "text",
      admin: { hidden: true }
    },
    {
      name: "softwareVersion",
      type: "text",
      admin: { hidden: true }
    },
    {
      name: "isActive",
      type: "checkbox",
      defaultValue: true,
      admin: {
        description: "Deactivated clients cannot start new authorization flows.",
        position: "sidebar"
      }
    },
    {
      name: "lastUsedAt",
      type: "date",
      admin: {
        readOnly: true,
        description: "Updated on each successful token exchange.",
        position: "sidebar"
      }
    }
  ],
  labels: {
    singular: "OAuth Client",
    plural: "OAuth Clients"
  }
};

// src/collections/csrf-nonces.ts
var denyPublicAccess3 = () => false;
var sweepExpiredNonces = async ({ operation, req }) => {
  if (operation !== "create") return;
  try {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await req.payload.delete({
      collection: "oauth-csrf-nonces",
      overrideAccess: true,
      where: {
        or: [
          { expiresAt: { less_than: now } },
          { consumedAt: { exists: true } }
        ]
      },
      req
    });
  } catch {
  }
};
var oauthCsrfNoncesCollection = {
  slug: "oauth-csrf-nonces",
  // Server-managed — opt out of document-locking so no FK column is added to
  // payload_locked_documents_rels (avoids the SQLite push rebuild bug; see clients.ts).
  lockDocuments: false,
  // Payload 4 defaults versions: true; nonces are ephemeral.
  versions: false,
  admin: { hidden: true },
  access: {
    create: denyPublicAccess3,
    read: denyPublicAccess3,
    update: denyPublicAccess3,
    delete: denyPublicAccess3
  },
  timestamps: false,
  hooks: {
    afterChange: [sweepExpiredNonces]
  },
  fields: [
    {
      name: "nonceHash",
      type: "text",
      required: true,
      index: true,
      admin: { readOnly: true }
    },
    {
      name: "userId",
      type: "text",
      required: true,
      admin: { readOnly: true }
    },
    {
      name: "expiresAt",
      type: "date",
      required: true,
      admin: { readOnly: true }
    },
    {
      name: "consumedAt",
      type: "date",
      admin: { readOnly: true }
    }
  ]
};

// src/collections/tokens.ts
var denyPublicAccess4 = () => false;
var cascadeRevokeAccessTokens = async ({
  doc,
  previousDoc,
  operation,
  req
}) => {
  if (operation !== "update") return;
  if (!doc.revokedAt || previousDoc?.revokedAt) return;
  if (doc.tokenType !== "refresh") return;
  const { docs: activeAccessTokens } = await req.payload.find({
    collection: "oauth-tokens",
    where: {
      and: [
        { clientId: { equals: doc.clientId } },
        { userId: { equals: doc.userId } },
        { tokenType: { equals: "access" } },
        { revokedAt: { equals: null } }
      ]
    },
    limit: 1e3,
    pagination: false,
    req
  });
  await Promise.all(
    activeAccessTokens.map(
      (token) => req.payload.update({
        collection: "oauth-tokens",
        id: token.id,
        data: { revokedAt: (/* @__PURE__ */ new Date()).toISOString() },
        req
      })
    )
  );
};
var oauthTokensCollection = {
  slug: "oauth-tokens",
  // Server-managed — opt out of document-locking so no FK column is added to
  // payload_locked_documents_rels (avoids the SQLite push rebuild bug; see clients.ts).
  lockDocuments: false,
  // Payload 4 defaults versions: true; token rows are not versioned documents.
  versions: false,
  admin: {
    group: "MCP",
    useAsTitle: "clientId",
    defaultColumns: ["clientId", "tokenType", "scope", "expiresAt", "revokedAt"],
    description: 'Access and refresh tokens issued via OAuth. Set "revoked at" (or delete a row) to revoke a connection. Read-only otherwise.'
  },
  access: {
    create: denyPublicAccess4,
    read: denyPublicAccess4,
    update: denyPublicAccess4,
    delete: denyPublicAccess4
  },
  timestamps: false,
  hooks: {
    afterChange: [cascadeRevokeAccessTokens]
  },
  fields: [
    {
      name: "tokenHash",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        hidden: true,
        description: "HMAC-SHA-256 hash of the token plaintext. Never store plaintext."
      }
    },
    {
      name: "tokenType",
      type: "select",
      required: true,
      index: true,
      admin: { readOnly: true },
      options: [
        { label: "Access Token", value: "access" },
        { label: "Refresh Token", value: "refresh" }
      ]
    },
    {
      name: "clientId",
      type: "text",
      required: true,
      index: true,
      admin: { readOnly: true }
    },
    {
      name: "userId",
      type: "text",
      required: true,
      index: true,
      admin: { readOnly: true }
    },
    {
      name: "scope",
      type: "text",
      admin: { readOnly: true }
    },
    {
      // Stores a camelCase-slug → CRUD ops map used to narrow sanitized MCP
      // items at request time. Empty `{}` means full operator grant.
      name: "capabilities",
      type: "json",
      admin: {
        readOnly: true,
        description: "OAuth capability flags (slug \u2192 find/create/update/delete) granted at consent."
      }
    },
    {
      name: "expiresAt",
      type: "date",
      required: true,
      index: true,
      admin: { readOnly: true }
    },
    {
      name: "revokedAt",
      type: "date",
      index: true,
      admin: {
        readOnly: true,
        description: "Set when the token is explicitly revoked or a refresh token family is invalidated."
      }
    },
    {
      name: "lastUsedAt",
      type: "date",
      admin: {
        readOnly: true,
        description: "Updated (best-effort) on each successful validation."
      }
    },
    {
      name: "parentTokenId",
      type: "text",
      index: true,
      admin: {
        readOnly: true,
        description: "ID of the refresh token this token replaced. Used to trace the rotation family."
      }
    }
  ],
  labels: {
    singular: "OAuth Token",
    plural: "OAuth Tokens"
  }
};

// src/lib/csrf.ts
import crypto2 from "crypto";

// src/lib/token-storage.ts
import crypto from "crypto";
var DEV_PEPPER = "dev-insecure-pepper-do-not-use-in-production-0000000";
function getPepper() {
  const pepper = process.env["PMOAUTH_TOKEN_PEPPER"];
  if (pepper && pepper.length >= 32) return pepper;
  const nodeEnv = process.env["NODE_ENV"];
  if (nodeEnv === "development" || nodeEnv === "test") return DEV_PEPPER;
  throw new Error(
    `[payload-plugin-mcp-oauth] PMOAUTH_TOKEN_PEPPER is missing or too short. It must be at least 32 characters outside of NODE_ENV=development|test. Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  );
}
function hashToken(plaintext) {
  return crypto.createHmac("sha256", getPepper()).update(plaintext).digest("hex");
}

// src/lib/csrf.ts
var DEFAULT_MAX_AGE_MS = 10 * 60 * 1e3;
var CLOCK_SKEW_MS = 60 * 1e3;
function sign(userId, clientId, redirectUri, codeChallenge, issuedAt) {
  return hashToken(`csrf|${userId}|${clientId}|${redirectUri}|${codeChallenge}|${issuedAt}`);
}
function makeCsrfToken(userId, clientId, redirectUri, codeChallenge, issuedAt = Date.now()) {
  return `${issuedAt}.${sign(userId, clientId, redirectUri, codeChallenge, issuedAt)}`;
}
function generateCsrfNonce() {
  return crypto2.randomBytes(16).toString("hex");
}
async function storeCsrfNonce(payload, userId, ttlMs = DEFAULT_MAX_AGE_MS) {
  const nonce = generateCsrfNonce();
  await payload.create({
    collection: "oauth-csrf-nonces",
    overrideAccess: true,
    data: {
      nonceHash: hashToken(nonce),
      userId,
      expiresAt: new Date(Date.now() + ttlMs).toISOString()
    }
  });
  return nonce;
}
async function consumeCsrfNonce(payload, nonce, userId) {
  if (typeof nonce !== "string" || nonce.length > 64) return false;
  const result = await payload.update({
    collection: "oauth-csrf-nonces",
    overrideAccess: true,
    where: {
      and: [
        { nonceHash: { equals: hashToken(nonce) } },
        { userId: { equals: userId } },
        { consumedAt: { equals: null } },
        { expiresAt: { greater_than: (/* @__PURE__ */ new Date()).toISOString() } }
      ]
    },
    data: { consumedAt: (/* @__PURE__ */ new Date()).toISOString() }
  });
  return (result.docs?.length ?? 0) > 0;
}
function verifyCsrfToken(token, userId, clientId, redirectUri, codeChallenge, maxAgeMs = DEFAULT_MAX_AGE_MS) {
  if (typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot > 15) return false;
  const mac = token.slice(dot + 1);
  if (mac.length !== 64) return false;
  const issuedAt = Number(token.slice(0, dot));
  if (!Number.isInteger(issuedAt) || issuedAt <= 0) return false;
  const age = Date.now() - issuedAt;
  if (age > maxAgeMs || age < -CLOCK_SKEW_MS) return false;
  const expected = sign(userId, clientId, redirectUri, codeChallenge, issuedAt);
  try {
    const tokenBuf = Buffer.from(mac, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (tokenBuf.length !== expectedBuf.length) return false;
    return crypto2.timingSafeEqual(tokenBuf, expectedBuf);
  } catch {
    return false;
  }
}

// src/lib/pkce.ts
import crypto3 from "crypto";
var CODE_VERIFIER_RE = /^[A-Za-z0-9\-._~]{43,128}$/;
var CODE_CHALLENGE_RE = /^[A-Za-z0-9\-_]{43}$/;
function validateCodeVerifier(verifier) {
  return typeof verifier === "string" && CODE_VERIFIER_RE.test(verifier);
}
function validateCodeChallenge(challenge) {
  return typeof challenge === "string" && CODE_CHALLENGE_RE.test(challenge);
}
var PkceError = class extends Error {
  code = "PKCE_METHOD_NOT_SUPPORTED";
  constructor(method) {
    super(
      `Unsupported code_challenge_method: "${method}". Only S256 is accepted. plain is permanently disabled.`
    );
    this.name = "PkceError";
  }
};
function verifyPkce(verifier, challenge, method) {
  if (method !== "S256") {
    throw new PkceError(method);
  }
  const computed = crypto3.createHash("sha256").update(verifier).digest("base64url");
  const computedBuf = Buffer.from(computed, "base64url");
  const challengeBuf = Buffer.from(challenge, "base64url");
  if (computedBuf.length !== challengeBuf.length) {
    crypto3.timingSafeEqual(computedBuf, computedBuf);
    return false;
  }
  return crypto3.timingSafeEqual(computedBuf, challengeBuf);
}

// src/lib/scope.ts
function toCamelCase(str) {
  return str.replace(/[-_\s]+(.)?/g, (_, chr) => chr ? chr.toUpperCase() : "").replace(/^(.)/, (_, chr) => chr.toLowerCase());
}
function resolveCollectionOps(cfg) {
  if (!cfg || typeof cfg !== "object") return null;
  const c = cfg;
  if ("enabled" in c) {
    if (c.enabled === true) return { find: true, create: true, update: true, delete: true };
    if (c.enabled && typeof c.enabled === "object") return { ...c.enabled };
    return null;
  }
  const tools = c.tools ?? {};
  return {
    find: tools.find !== false,
    create: tools.create !== false,
    update: tools.update !== false,
    delete: tools.delete !== false
  };
}
function resolveGlobalOps(cfg) {
  if (!cfg || typeof cfg !== "object") return null;
  const c = cfg;
  if ("enabled" in c) {
    if (c.enabled === true) return { find: true, update: true };
    if (c.enabled && typeof c.enabled === "object") return { ...c.enabled };
    return null;
  }
  const tools = c.tools ?? {};
  return {
    find: tools.find !== false,
    update: tools.update !== false
  };
}
function scopeToCapabilities(scope, mcpPluginOptions) {
  const tokens = scope.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return { valid: true, invalidScopes: [], capabilities: {} };
  }
  const invalidScopes = [];
  const capabilities = {};
  for (const token of tokens) {
    const colon = token.indexOf(":");
    if (colon <= 0 || colon === token.length - 1) {
      invalidScopes.push(token);
      continue;
    }
    const slug = token.slice(0, colon);
    const op = token.slice(colon + 1);
    const key = toCamelCase(slug);
    const colOps = resolveCollectionOps(mcpPluginOptions.collections?.[slug]);
    if (colOps) {
      const requestedOps = collectionOpsFor(op);
      if (!requestedOps) {
        invalidScopes.push(token);
        continue;
      }
      if (!Object.entries(requestedOps).every(([k, v]) => !v || colOps[k])) {
        invalidScopes.push(token);
        continue;
      }
      capabilities[key] = { ...capabilities[key] ?? {}, ...requestedOps };
      continue;
    }
    const globOps = resolveGlobalOps(mcpPluginOptions.globals?.[slug]);
    if (globOps) {
      const requestedOps = globalOpsFor(op);
      if (!requestedOps) {
        invalidScopes.push(token);
        continue;
      }
      if (!Object.entries(requestedOps).every(([k, v]) => !v || globOps[k])) {
        invalidScopes.push(token);
        continue;
      }
      capabilities[key] = { ...capabilities[key] ?? {}, ...requestedOps };
      continue;
    }
    invalidScopes.push(token);
  }
  if (invalidScopes.length > 0) {
    return { valid: false, invalidScopes, capabilities: {} };
  }
  return { valid: true, invalidScopes: [], capabilities };
}
function filterItemsByCapabilities(items, capabilities) {
  if (Object.keys(capabilities).length === 0) return items;
  return items.filter((item) => {
    if (item.type === "tool") {
      return item.configKey === "getConfigInfo";
    }
    if (item.type === "prompt" || item.type === "resource") {
      return false;
    }
    if (item.type === "collectionTool") {
      const caps = lookupCaps(capabilities, item.collectionSlug);
      if (!caps) return false;
      return isCollectionToolAllowed(item.configKey, caps);
    }
    if (item.type === "globalTool") {
      const caps = lookupCaps(capabilities, item.globalSlug);
      if (!caps) return false;
      return isGlobalToolAllowed(item.configKey, caps);
    }
    return false;
  });
}
function lookupCaps(capabilities, slug) {
  const direct = capabilities[slug];
  if (direct && typeof direct === "object") return direct;
  const camel = capabilities[toCamelCase(slug)];
  if (camel && typeof camel === "object") return camel;
  return null;
}
function isCollectionToolAllowed(configKey, caps) {
  switch (configKey) {
    case "find":
    case "findDistinct":
    case "count":
    case "getCollectionSchema":
    case "findVersions":
    case "findVersionByID":
    case "countVersions":
      return Boolean(caps.find);
    case "create":
    case "duplicate":
    case "getUploadInstructions":
      return Boolean(caps.create);
    case "update":
    case "restoreVersion":
      return Boolean(caps.update);
    case "delete":
      return Boolean(caps.delete);
    default:
      return false;
  }
}
function isGlobalToolAllowed(configKey, caps) {
  switch (configKey) {
    case "find":
    case "getGlobalSchema":
    case "findVersions":
    case "findVersionByID":
    case "countVersions":
      return Boolean(caps.find);
    case "update":
    case "restoreVersion":
      return Boolean(caps.update);
    default:
      return false;
  }
}
function collectionOpsFor(op) {
  if (op === "read") return { find: true };
  if (op === "write") return { create: true, update: true };
  if (op === "delete") return { delete: true };
  return null;
}
function globalOpsFor(op) {
  if (op === "read") return { find: true };
  if (op === "write") return { update: true };
  return null;
}

// src/endpoints/helpers.ts
function jsonResponse(data, status = 200, extraHeaders = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Strict-Transport-Security": "max-age=31536000",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders
    }
  });
}
function oauthErrorResponse(status, error, description) {
  return jsonResponse({ error, error_description: description }, status);
}
function redirectResponse(url, status = 302) {
  return new Response(null, { status, headers: { Location: url } });
}
async function parseBody(req) {
  if (req.data && typeof req.data === "object") {
    return req.data;
  }
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text?.();
    if (text) return Object.fromEntries(new URLSearchParams(text));
    return {};
  }
  try {
    const data = await req.json?.();
    return data ?? {};
  } catch {
    return {};
  }
}

// src/endpoints/authorize.ts
var SCOPE_LABELS = {
  "posts:read": "Read posts",
  "posts:write": "Create and update posts",
  "posts:delete": "Delete posts",
  "media:read": "Read media files",
  "media:write": "Upload and manage media",
  "users:read": "Read user profiles",
  openid: "Confirm your identity",
  profile: "Access your profile information",
  email: "Access your email address"
};
function e(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}
function buildConsentHtml(p) {
  const hasScope = p.scope.trim().length > 0;
  const labels = hasScope ? p.scope.split(/\s+/).filter(Boolean).map((s) => SCOPE_LABELS[s] ?? s) : ["All tools enabled on this server"];
  const items = labels.map((l) => `<li>${e(l)}</li>`).join("");
  const note = hasScope && p.scopeEnforced ? "Only the capabilities listed above will be granted, on your behalf. Only approve applications you trust." : "Approving grants the application access to <strong>all tools enabled on this server</strong>, on your behalf. Only approve applications you trust.";
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Authorize ${e(p.clientName)}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;padding:0 1rem}
h1{font-size:1.25rem;margin-bottom:0.5rem}
.scope-list{list-style:disc;padding-left:1.5rem;margin:1rem 0}
.note{font-size:0.85rem;color:#555;background:#f7f7f7;border-left:3px solid #d0d0d0;padding:0.6rem 0.8rem;margin:1rem 0}
.actions{display:flex;gap:0.75rem;margin-top:1.5rem}
.btn{padding:0.5rem 1.25rem;border:none;border-radius:4px;cursor:pointer;font-size:1rem}
.btn-approve{background:#0070f3;color:#fff}
.btn-deny{background:#f0f0f0;color:#333}
</style>
</head><body>
<h1>Authorize <strong>${e(p.clientName)}</strong></h1>
<p>Approving will let <strong>${e(p.clientName)}</strong> access your Payload CMS instance <strong>acting as you</strong>. It will be granted:</p>
<ul class="scope-list">${items}</ul>
<p class="note">${note}</p>
<form method="POST" action="${e(p.consentPath)}">
<input type="hidden" name="client_id" value="${e(p.clientId)}">
<input type="hidden" name="redirect_uri" value="${e(p.redirectUri)}">
<input type="hidden" name="code_challenge" value="${e(p.codeChallenge)}">
<input type="hidden" name="code_challenge_method" value="${e(p.codeChallengeMethod)}">
<input type="hidden" name="state" value="${e(p.state ?? "")}">
<input type="hidden" name="user_id" value="${e(p.userId)}">
<input type="hidden" name="scope" value="${e(p.scope)}">
<input type="hidden" name="resource" value="${e(p.resource)}">
<input type="hidden" name="csrf_token" value="${e(p.csrfToken)}">
<input type="hidden" name="csrf_nonce" value="${e(p.csrfNonce)}">
<div class="actions">
<button type="submit" name="decision" value="approve" class="btn btn-approve">Approve</button>
<button type="submit" name="decision" value="deny" class="btn btn-deny">Deny</button>
</div>
</form>
</body></html>`;
}
function errorRedirect(redirectUri, error, description, state) {
  if (!redirectUri) {
    return oauthErrorResponse(400, error, description);
  }
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);
  if (state) url.searchParams.set("state", state);
  return redirectResponse(url.toString());
}
function makeAuthorizeHandler(adminPath = "/admin", loginPath, consentPath = "/api/oauth/consent", mcpPluginOptions) {
  return async (req) => {
    const q = req.query;
    const responseType = q["response_type"];
    const clientId = q["client_id"];
    const redirectUri = q["redirect_uri"];
    const codeChallenge = q["code_challenge"];
    const codeChallengeMethod = q["code_challenge_method"];
    const state = q["state"];
    const scope = q["scope"] ?? "";
    const resource = q["resource"] ?? "";
    if (responseType !== "code") {
      return errorRedirect(null, "unsupported_response_type", "Only response_type=code is supported", state);
    }
    if (!clientId || typeof clientId !== "string") {
      return errorRedirect(null, "invalid_request", "client_id is required", state);
    }
    const { docs } = await req.payload.find({
      collection: "oauth-clients",
      overrideAccess: true,
      where: { clientId: { equals: clientId }, isActive: { equals: true } },
      limit: 1
    });
    const client = docs[0];
    if (!client) {
      return errorRedirect(null, "invalid_client", "Unknown client_id", state);
    }
    const registered = client["redirectUris"].map((r) => r.uri);
    if (!redirectUri || !registered.includes(redirectUri)) {
      return errorRedirect(null, "invalid_redirect_uri", "redirect_uri does not match registered URIs", state);
    }
    if (!codeChallenge || typeof codeChallenge !== "string") {
      return errorRedirect(redirectUri, "invalid_request", "code_challenge is required", state);
    }
    if (codeChallengeMethod !== "S256") {
      return errorRedirect(redirectUri, "invalid_request", "code_challenge_method must be S256", state);
    }
    if (!validateCodeChallenge(codeChallenge)) {
      return errorRedirect(redirectUri, "invalid_request", "code_challenge must be 43 base64url characters (RFC 7636 S256)", state);
    }
    if (scope && mcpPluginOptions) {
      const scopeResult = scopeToCapabilities(scope, mcpPluginOptions);
      if (!scopeResult.valid) {
        return errorRedirect(redirectUri, "invalid_scope", `Unknown or unsupported scope: ${scopeResult.invalidScopes.join(" ")}`, state);
      }
    }
    const user = req.user;
    if (!user) {
      const resolvedLogin = loginPath ?? `${adminPath}/login`;
      let returnPath = "/api/oauth/authorize";
      try {
        const u = new URL(req.url ?? "");
        returnPath = u.pathname + u.search;
      } catch {
        returnPath = req.url ?? "/api/oauth/authorize";
      }
      return redirectResponse(`${resolvedLogin}?redirect=${encodeURIComponent(returnPath)}`);
    }
    const clientName = String(client["clientName"] ?? clientId);
    const userId = String(user["id"] ?? "");
    const csrfToken = makeCsrfToken(userId, clientId, redirectUri, codeChallenge);
    const csrfNonce = await storeCsrfNonce(req.payload, userId);
    return new Response(buildConsentHtml({ clientName, scope, clientId, redirectUri, codeChallenge, codeChallengeMethod, state, userId, resource, csrfToken, csrfNonce, consentPath, scopeEnforced: !!mcpPluginOptions }), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        // MUST NOT be 'no-referrer': per the Fetch spec, a 'no-referrer' page sends
        // `Origin: null` on its form submissions, and Payload rejects cookie auth on
        // a null-origin POST — so the Approve submit loses req.user and the consent
        // endpoint 401s. 'strict-origin-when-cross-origin' (the documented value in
        // the threat model, row I6) keeps the real Origin on this same-origin POST
        // while still stripping the full URL from the cross-origin client callback.
        "Referrer-Policy": "strict-origin-when-cross-origin",
        // form-action omitted intentionally: Chrome blocks form-POST redirects to
        // origins not in form-action, and the consent redirect goes to the client's
        // localhost callback (random port). default-src 'none' already blocks XSS,
        // so form-action adds no practical security here.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'"
      }
    });
  };
}

// src/lib/token-generation.ts
import crypto4 from "crypto";
var KIND_PREFIX = {
  access: "pmoauth_at_",
  refresh: "pmoauth_rt_",
  code: "pmoauth_ac_"
};
function generateToken(kind) {
  const prefix = KIND_PREFIX[kind];
  const entropy = crypto4.randomBytes(32).toString("base64url");
  return `${prefix}${entropy}`;
}

// src/lib/auth-codes.ts
async function issueAuthCode(payload, params) {
  const { clientId, userId, redirectUri, scope, codeChallenge, codeChallengeMethod, ttlSeconds = 60 } = params;
  const plaintext = generateToken("code");
  const codeHash = hashToken(plaintext);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1e3).toISOString();
  await payload.create({
    collection: "oauth-auth-codes",
    overrideAccess: true,
    data: { codeHash, clientId, userId, redirectUri, scope, codeChallenge, codeChallengeMethod, expiresAt }
  });
  return plaintext;
}
async function consumeAuthCode(payload, plaintext, params) {
  const codeHash = hashToken(plaintext);
  const { docs } = await payload.find({
    collection: "oauth-auth-codes",
    overrideAccess: true,
    where: {
      and: [
        { codeHash: { equals: codeHash } },
        { consumedAt: { equals: null } },
        { expiresAt: { greater_than: (/* @__PURE__ */ new Date()).toISOString() } }
      ]
    },
    limit: 1,
    pagination: false
  });
  const code = docs[0];
  if (!code) return null;
  if (code["clientId"] !== params.clientId) return null;
  if (code["redirectUri"] !== params.redirectUri) return null;
  if (!verifyPkce(params.codeVerifier, code["codeChallenge"], "S256")) return null;
  const result = await payload.update({
    collection: "oauth-auth-codes",
    overrideAccess: true,
    where: {
      and: [
        { codeHash: { equals: codeHash } },
        { consumedAt: { equals: null } }
      ]
    },
    data: { consumedAt: (/* @__PURE__ */ new Date()).toISOString() }
  });
  const consumed = result.docs;
  if (!consumed?.length) return null;
  return {
    clientId: code["clientId"],
    userId: code["userId"],
    redirectUri: code["redirectUri"],
    scope: code["scope"] ?? ""
  };
}

// src/endpoints/consent.ts
function makeConsentHandler(authCodeTtlSeconds = 300, issuer = "", mcpPluginOptions) {
  return async (req) => {
    try {
      if (req.method !== "POST") {
        return oauthErrorResponse(405, "invalid_request", "Method not allowed");
      }
      const sessionUserId = String(req.user?.["id"] ?? "");
      if (!sessionUserId) {
        return oauthErrorResponse(401, "access_denied", "Authentication required");
      }
      const body = await parseBody(req);
      const decision = body["decision"];
      const clientId = body["client_id"];
      const redirectUri = body["redirect_uri"];
      const codeChallenge = body["code_challenge"];
      const codeChallengeMethod = body["code_challenge_method"];
      const state = body["state"];
      const bodyUserId = body["user_id"] != null ? String(body["user_id"]) : void 0;
      const csrfToken = body["csrf_token"];
      const csrfNonce = body["csrf_nonce"];
      const scope = body["scope"] ?? "";
      const resource = body["resource"] ?? "";
      if (!clientId || !redirectUri || !codeChallenge || !codeChallengeMethod || !csrfToken || !csrfNonce) {
        return oauthErrorResponse(400, "invalid_request", "Missing required consent parameters");
      }
      if (bodyUserId && bodyUserId !== sessionUserId) {
        return oauthErrorResponse(403, "access_denied", "Session does not match the authorization request");
      }
      if (!verifyCsrfToken(csrfToken, sessionUserId, clientId, redirectUri, codeChallenge)) {
        return oauthErrorResponse(400, "invalid_request", "Invalid or expired CSRF token");
      }
      if (!await consumeCsrfNonce(req.payload, csrfNonce, sessionUserId)) {
        return oauthErrorResponse(400, "invalid_request", "CSRF nonce already used or expired");
      }
      if (scope && mcpPluginOptions) {
        const scopeResult = scopeToCapabilities(scope, mcpPluginOptions);
        if (!scopeResult.valid) {
          return oauthErrorResponse(400, "invalid_scope", `Unknown or unsupported scope: ${scopeResult.invalidScopes.join(" ")}`);
        }
      }
      if (decision === "deny") {
        const url2 = new URL(redirectUri);
        url2.searchParams.set("error", "access_denied");
        url2.searchParams.set("error_description", "The user denied the authorization request");
        if (state) url2.searchParams.set("state", state);
        return redirectResponse(url2.toString());
      }
      if (decision !== "approve") {
        return oauthErrorResponse(400, "invalid_request", "decision must be approve or deny");
      }
      const { docs } = await req.payload.find({
        collection: "oauth-clients",
        overrideAccess: true,
        where: { clientId: { equals: clientId }, isActive: { equals: true } },
        limit: 1
      });
      const client = docs[0];
      if (!client) {
        return oauthErrorResponse(400, "invalid_client", "Unknown client_id");
      }
      const registered = client["redirectUris"].map((r) => r.uri);
      if (!registered.includes(redirectUri)) {
        return oauthErrorResponse(400, "invalid_redirect_uri", "redirect_uri does not match registered URIs");
      }
      if (codeChallengeMethod !== "S256") {
        return oauthErrorResponse(400, "invalid_request", "code_challenge_method must be S256");
      }
      const code = await issueAuthCode(req.payload, {
        clientId,
        userId: sessionUserId,
        redirectUri,
        scope,
        codeChallenge,
        codeChallengeMethod,
        ttlSeconds: authCodeTtlSeconds
      });
      const url = new URL(redirectUri);
      url.searchParams.set("code", code);
      if (state) url.searchParams.set("state", state);
      if (issuer) url.searchParams.set("iss", issuer);
      if (resource) url.searchParams.set("resource", resource);
      return redirectResponse(url.toString());
    } catch (err) {
      console.error("[pmoauth] consent endpoint error:", err);
      return oauthErrorResponse(500, "server_error", "An internal server error occurred");
    }
  };
}

// src/endpoints/metadata-as.ts
function buildAsMetadata(baseUrl) {
  const base = baseUrl.replace(/\/$/, "");
  return {
    issuer: base,
    authorization_endpoint: `${base}/api/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    registration_endpoint: `${base}/api/oauth/register`,
    revocation_endpoint: `${base}/api/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"]
  };
}
function makeAsMetadataHandler(issuer) {
  const metadata = buildAsMetadata(issuer);
  return () => jsonResponse(metadata, 200, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET"
  });
}

// src/endpoints/metadata-prm.ts
function buildPrmMetadata(baseUrl) {
  const base = baseUrl.replace(/\/$/, "");
  return {
    resource: base,
    authorization_servers: [base],
    bearer_methods_supported: ["header"]
  };
}
function makePrmMetadataHandler(issuer) {
  const metadata = buildPrmMetadata(issuer);
  return () => jsonResponse(metadata, 200, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET"
  });
}

// src/endpoints/register.ts
import { randomUUID } from "crypto";
function makeRegisterHandler() {
  return async (req) => {
    if (req.method !== "POST") {
      return oauthErrorResponse(405, "invalid_request", "Method not allowed");
    }
    const body = await parseBody(req);
    const clientName = body["client_name"];
    if (typeof clientName !== "string" || clientName.trim() === "") {
      return oauthErrorResponse(400, "invalid_client_metadata", "client_name is required");
    }
    if (clientName.length > 100) {
      return oauthErrorResponse(400, "invalid_client_metadata", "client_name must not exceed 100 characters");
    }
    const rawRedirectUris = body["redirect_uris"];
    if (!Array.isArray(rawRedirectUris) || rawRedirectUris.length === 0) {
      return oauthErrorResponse(400, "invalid_client_metadata", "redirect_uris must be a non-empty array");
    }
    if (rawRedirectUris.length > 10) {
      return oauthErrorResponse(400, "invalid_client_metadata", "redirect_uris must not contain more than 10 URIs");
    }
    const redirectUris = [];
    for (const uri of rawRedirectUris) {
      if (typeof uri !== "string") {
        return oauthErrorResponse(400, "invalid_client_metadata", "redirect_uris must contain strings");
      }
      if (uri.length > 2048) {
        return oauthErrorResponse(400, "invalid_redirect_uri", "redirect_uri exceeds maximum length of 2048 characters");
      }
      let parsed;
      try {
        parsed = new URL(uri);
      } catch {
        return oauthErrorResponse(400, "invalid_redirect_uri", `Invalid redirect_uri: ${uri}`);
      }
      if (parsed.hash) {
        return oauthErrorResponse(400, "invalid_redirect_uri", `redirect_uri must not contain a fragment: ${uri}`);
      }
      const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]";
      if (parsed.protocol !== "https:" && !isLocalhost) {
        return oauthErrorResponse(400, "invalid_redirect_uri", `redirect_uri must use HTTPS: ${uri}`);
      }
      redirectUris.push(uri);
    }
    const authMethod = body["token_endpoint_auth_method"];
    if (authMethod !== void 0 && authMethod !== "none") {
      return oauthErrorResponse(400, "invalid_client_metadata", "Only token_endpoint_auth_method=none is supported");
    }
    const ALLOWED_GRANTS = /* @__PURE__ */ new Set(["authorization_code", "refresh_token"]);
    const grantTypes = body["grant_types"];
    if (grantTypes !== void 0) {
      if (!Array.isArray(grantTypes) || grantTypes.some((g) => !ALLOWED_GRANTS.has(g))) {
        return oauthErrorResponse(400, "invalid_client_metadata", "Unsupported grant_type");
      }
    }
    const responseTypes = body["response_types"];
    if (responseTypes !== void 0) {
      if (!Array.isArray(responseTypes) || responseTypes.some((r) => r !== "code")) {
        return oauthErrorResponse(400, "invalid_client_metadata", "Unsupported response_type");
      }
    }
    const softwareId = body["software_id"];
    if (softwareId !== void 0 && (typeof softwareId !== "string" || softwareId.length > 100)) {
      return oauthErrorResponse(400, "invalid_client_metadata", "software_id must be a string of at most 100 characters");
    }
    const softwareVersion = body["software_version"];
    if (softwareVersion !== void 0 && (typeof softwareVersion !== "string" || softwareVersion.length > 100)) {
      return oauthErrorResponse(400, "invalid_client_metadata", "software_version must be a string of at most 100 characters");
    }
    const clientId = randomUUID();
    const trimmedName = clientName.trim();
    await req.payload.create({
      collection: "oauth-clients",
      overrideAccess: true,
      data: {
        clientId,
        clientName: trimmedName,
        redirectUris: redirectUris.map((uri) => ({ uri })),
        tokenEndpointAuthMethod: "none",
        grantTypes: ["authorization_code", "refresh_token"],
        responseTypes: ["code"],
        softwareId: typeof softwareId === "string" ? softwareId : void 0,
        softwareVersion: typeof softwareVersion === "string" ? softwareVersion : void 0,
        isActive: true
      }
    });
    return jsonResponse(
      {
        client_id: clientId,
        client_name: trimmedName,
        redirect_uris: redirectUris,
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"]
      },
      201
    );
  };
}

// src/endpoints/revoke.ts
function makeRevokeHandler() {
  return async (req) => {
    if (req.method !== "POST") {
      return jsonResponse({});
    }
    const body = await parseBody(req);
    const token = body["token"];
    const clientId = body["client_id"];
    if (!token || typeof token !== "string") {
      return jsonResponse({});
    }
    const hash = hashToken(token);
    const { docs } = await req.payload.find({
      collection: "oauth-tokens",
      overrideAccess: true,
      where: { tokenHash: { equals: hash } },
      limit: 1
    });
    const doc = docs[0];
    if (!doc) {
      return jsonResponse({});
    }
    if (clientId && doc["clientId"] !== clientId) {
      return jsonResponse({});
    }
    if (doc["revokedAt"]) {
      return jsonResponse({});
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await req.payload.update({
      collection: "oauth-tokens",
      overrideAccess: true,
      id: String(doc["id"]),
      data: { revokedAt: now }
    });
    if (doc["tokenType"] === "refresh") {
      const { docs: accessDocs } = await req.payload.find({
        collection: "oauth-tokens",
        overrideAccess: true,
        where: {
          parentTokenId: { equals: String(doc["id"]) },
          revokedAt: { equals: null }
        },
        limit: 100
      });
      await Promise.all(
        accessDocs.map(
          (ad) => req.payload.update({
            collection: "oauth-tokens",
            overrideAccess: true,
            id: String(ad["id"]),
            data: { revokedAt: now }
          })
        )
      );
    }
    return jsonResponse({});
  };
}

// src/lib/tokens.ts
var DEFAULT_ACCESS_TTL = 60 * 60;
var DEFAULT_REFRESH_TTL = 30 * 24 * 60 * 60;
async function issueTokenPair(payload, params) {
  const {
    clientId,
    userId,
    scope,
    capabilities,
    accessTtlSeconds = DEFAULT_ACCESS_TTL,
    refreshTtlSeconds = DEFAULT_REFRESH_TTL,
    parentTokenId
  } = params;
  const accessPlaintext = generateToken("access");
  const refreshPlaintext = generateToken("refresh");
  const now = Date.now();
  const accessExpiresAt = new Date(now + accessTtlSeconds * 1e3).toISOString();
  const refreshExpiresAt = new Date(now + refreshTtlSeconds * 1e3).toISOString();
  await payload.create({
    collection: "oauth-tokens",
    overrideAccess: true,
    data: {
      tokenHash: hashToken(accessPlaintext),
      tokenType: "access",
      clientId,
      userId,
      scope,
      capabilities,
      expiresAt: accessExpiresAt,
      parentTokenId: parentTokenId ?? null
    }
  });
  await payload.create({
    collection: "oauth-tokens",
    overrideAccess: true,
    data: {
      tokenHash: hashToken(refreshPlaintext),
      tokenType: "refresh",
      clientId,
      userId,
      scope,
      capabilities,
      expiresAt: refreshExpiresAt,
      parentTokenId: parentTokenId ?? null
    }
  });
  return {
    access_token: accessPlaintext,
    refresh_token: refreshPlaintext,
    expires_in: accessTtlSeconds,
    token_type: "Bearer",
    scope
  };
}
async function rotateRefreshToken(payload, refreshPlaintext, params) {
  const tokenHash = hashToken(refreshPlaintext);
  const { docs } = await payload.find({
    collection: "oauth-tokens",
    overrideAccess: true,
    where: {
      and: [
        { tokenHash: { equals: tokenHash } },
        { tokenType: { equals: "refresh" } },
        { clientId: { equals: params.clientId } }
      ]
    },
    limit: 1,
    pagination: false
  });
  const token = docs[0];
  if (!token) return null;
  if (new Date(token["expiresAt"]) < /* @__PURE__ */ new Date()) return null;
  if (token["revokedAt"]) {
    await revokeAllForClientUser(payload, token["clientId"], token["userId"]);
    return null;
  }
  const result = await payload.update({
    collection: "oauth-tokens",
    overrideAccess: true,
    where: {
      and: [
        { tokenHash: { equals: tokenHash } },
        { revokedAt: { equals: null } }
      ]
    },
    data: { revokedAt: (/* @__PURE__ */ new Date()).toISOString() }
  });
  const revoked = result.docs;
  if (!revoked?.length) return null;
  return issueTokenPair(payload, {
    clientId: token["clientId"],
    userId: token["userId"],
    scope: token["scope"] ?? "",
    capabilities: token["capabilities"] ?? {},
    accessTtlSeconds: params.accessTtlSeconds,
    refreshTtlSeconds: params.refreshTtlSeconds,
    parentTokenId: String(token.id)
  });
}
async function revokeAllForClientUser(payload, clientId, userId) {
  const { docs } = await payload.find({
    collection: "oauth-tokens",
    overrideAccess: true,
    where: {
      and: [
        { clientId: { equals: clientId } },
        { userId: { equals: userId } },
        { revokedAt: { equals: null } }
      ]
    },
    limit: 1e3,
    pagination: false
  });
  const revokedAt = (/* @__PURE__ */ new Date()).toISOString();
  await Promise.all(
    docs.map(
      (t) => payload.update({
        collection: "oauth-tokens",
        overrideAccess: true,
        id: t.id,
        data: { revokedAt }
      })
    )
  );
}

// src/endpoints/token.ts
function makeTokenHandler(mcpPluginOptions) {
  return async (req) => {
    try {
      if (req.method !== "POST") {
        return oauthErrorResponse(405, "invalid_request", "Method not allowed");
      }
      const body = await parseBody(req);
      const grantType = body["grant_type"];
      if (!grantType) {
        return oauthErrorResponse(400, "invalid_request", "grant_type is required");
      }
      if (grantType === "authorization_code") {
        return await handleAuthCode(req, body, mcpPluginOptions);
      }
      if (grantType === "refresh_token") {
        return await handleRefresh(req, body);
      }
      return oauthErrorResponse(400, "unsupported_grant_type", `Unsupported grant_type: ${grantType}`);
    } catch (err) {
      console.error("[pmoauth] token endpoint error:", err);
      return oauthErrorResponse(500, "server_error", "An internal server error occurred");
    }
  };
}
async function handleAuthCode(req, body, mcpPluginOptions) {
  const code = body["code"];
  const clientId = body["client_id"];
  const redirectUri = body["redirect_uri"];
  const codeVerifier = body["code_verifier"];
  if (!code || !clientId || !redirectUri || !codeVerifier) {
    return oauthErrorResponse(400, "invalid_request", "code, client_id, redirect_uri, and code_verifier are required");
  }
  if (!validateCodeVerifier(codeVerifier)) {
    return oauthErrorResponse(400, "invalid_request", "code_verifier does not conform to RFC 7636 (43-128 unreserved chars)");
  }
  const ctx = await consumeAuthCode(req.payload, code, { clientId, redirectUri, codeVerifier });
  if (!ctx) {
    return oauthErrorResponse(400, "invalid_grant", "Authorization code is invalid, expired, or already used");
  }
  let capabilities = {};
  if (mcpPluginOptions) {
    const scopeResult = scopeToCapabilities(ctx.scope ?? "", mcpPluginOptions);
    if (!scopeResult.valid) {
      return oauthErrorResponse(
        400,
        "invalid_scope",
        `Requested scope can no longer be granted: ${scopeResult.invalidScopes.join(" ")}`
      );
    }
    capabilities = scopeResult.capabilities;
  }
  const pair = await issueTokenPair(req.payload, {
    clientId: ctx.clientId,
    userId: ctx.userId,
    scope: ctx.scope,
    capabilities
  });
  return jsonResponse(pair);
}
async function handleRefresh(req, body) {
  const refreshToken = body["refresh_token"];
  const clientId = body["client_id"];
  if (!refreshToken || !clientId) {
    return oauthErrorResponse(400, "invalid_request", "refresh_token and client_id are required");
  }
  const pair = await rotateRefreshToken(req.payload, refreshToken, { clientId });
  if (!pair) {
    return oauthErrorResponse(400, "invalid_grant", "Refresh token is invalid, expired, or revoked");
  }
  return jsonResponse(pair);
}

// src/middleware/rate-limit.ts
function createRateLimiter(config) {
  const buckets = /* @__PURE__ */ new Map();
  return {
    check(key) {
      const now = Date.now();
      if (buckets.size > 1e3) {
        for (const [k, b] of buckets) {
          if (b.resetAt <= now) buckets.delete(k);
        }
      }
      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + config.windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      return bucket.count <= config.maxRequests;
    }
  };
}
var DEFAULTS = {
  register: { windowMs: 6e4, maxRequests: 10 },
  authorize: { windowMs: 6e4, maxRequests: 60 },
  token: { windowMs: 6e4, maxRequests: 60 },
  revoke: { windowMs: 6e4, maxRequests: 60 }
};
function createRateLimitStore(overrides = {}) {
  return {
    register: createRateLimiter({ ...DEFAULTS.register, ...overrides.register }),
    authorize: createRateLimiter({ ...DEFAULTS.authorize, ...overrides.authorize }),
    token: createRateLimiter({ ...DEFAULTS.token, ...overrides.token }),
    revoke: createRateLimiter({ ...DEFAULTS.revoke, ...overrides.revoke })
  };
}
function rateLimitKey(ip) {
  const id = ip?.trim();
  return `ip:${id || "unknown"}`;
}

// src/middleware/wrap-mcp.ts
import { filterMCPItems } from "@payloadcms/plugin-mcp/internal";
import { UnauthorizedError } from "payload";

// src/lib/validate.ts
var CLOCK_SKEW_MS2 = 3e4;
async function validateAccessToken(payload, plaintext) {
  if (!plaintext.startsWith("pmoauth_at_")) return null;
  const tokenHash = hashToken(plaintext);
  const { docs } = await payload.find({
    collection: "oauth-tokens",
    overrideAccess: true,
    where: {
      and: [
        { tokenHash: { equals: tokenHash } },
        { tokenType: { equals: "access" } }
      ]
    },
    limit: 1,
    pagination: false
  });
  const token = docs[0];
  if (!token) return null;
  if (token["revokedAt"]) return null;
  if (new Date(token["expiresAt"]).getTime() + CLOCK_SKEW_MS2 < Date.now()) return null;
  payload.update({
    collection: "oauth-tokens",
    overrideAccess: true,
    id: token.id,
    data: { lastUsedAt: (/* @__PURE__ */ new Date()).toISOString() }
  }).catch(() => void 0);
  return {
    tokenId: String(token.id),
    userId: token["userId"],
    clientId: token["clientId"],
    scope: token["scope"] ?? "",
    capabilities: token["capabilities"] ?? {}
  };
}

// src/types.ts
var PayloadMcpOAuthError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "PayloadMcpOAuthError";
    this.code = code;
  }
};
var OAuthInvalidTokenError = class extends Error {
  constructor() {
    super("OAuth token validation failed");
    this.name = "OAuthInvalidTokenError";
  }
};

// src/middleware/wrap-mcp.ts
function installOverrideGetAuthorizedMCP(mcpPluginOptions, userCollection) {
  mcpPluginOptions.overrideGetAuthorizedMCP = async ({
    overrideAccess,
    pluginConfig,
    req
  }) => {
    const bearer = req.headers.get?.("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!bearer?.startsWith("pmoauth_")) {
      return defaultAuthorize({ overrideAccess, pluginConfig, req });
    }
    req.payload.logger?.info(
      `[pmoauth] overrideGetAuthorizedMCP: validating token prefix=${bearer.slice(0, 18)}`
    );
    const ctx = await validateAccessToken(req.payload, bearer);
    if (!ctx) {
      req.payload.logger?.warn(
        "[pmoauth] overrideGetAuthorizedMCP: validateAccessToken returned null \u2014 token not found/expired/revoked"
      );
      throw new OAuthInvalidTokenError();
    }
    req.payload.logger?.info(
      `[pmoauth] overrideGetAuthorizedMCP: token valid, userId=${ctx.userId}, fetching user`
    );
    let user;
    try {
      user = await req.payload.findByID({
        collection: userCollection,
        overrideAccess: true,
        id: ctx.userId
      });
    } catch (err) {
      req.payload.logger?.error(
        `[pmoauth] overrideGetAuthorizedMCP: findByID failed for userId=${ctx.userId}: ${String(err)}`
      );
      throw new OAuthInvalidTokenError();
    }
    if (!user) {
      req.payload.logger?.warn(
        `[pmoauth] overrideGetAuthorizedMCP: user not found for userId=${ctx.userId}`
      );
      throw new OAuthInvalidTokenError();
    }
    const authenticated = user;
    authenticated["collection"] = userCollection;
    authenticated["_strategy"] = "local-jwt";
    req.user = authenticated;
    req.payload.logger?.info("[pmoauth] overrideGetAuthorizedMCP: success, filtering MCP items");
    let items = await filterMCPItems({
      items: pluginConfig.items,
      overrideAccess,
      req
    });
    if (Object.keys(ctx.capabilities).length > 0) {
      items = filterItemsByCapabilities(items, ctx.capabilities);
    }
    return { items, overrideAccess };
  };
}
async function defaultAuthorize({
  overrideAccess,
  pluginConfig,
  req
}) {
  if (req.headers) {
    const headers = new Headers(req.headers);
    const hasAuthorization = headers.has("Authorization");
    headers.set("DisableAutologin", "true");
    req.user = (await req.payload.auth({
      headers,
      req
    })).user;
    if (hasAuthorization && !req.user) {
      throw new UnauthorizedError(req.t);
    }
  }
  return {
    items: await filterMCPItems({
      items: pluginConfig.items,
      overrideAccess,
      req
    }),
    overrideAccess
  };
}
function wrapMcpEndpointHandler(original, issuer, canonicalPathname) {
  const prmUrl = `${issuer.replace(/\/$/, "")}${OAUTH_PRM_METADATA_PATH}`;
  function addResourceMetadata(wwwAuth) {
    const resourceMeta = `resource_metadata="${prmUrl}"`;
    if (!wwwAuth) return `Bearer ${resourceMeta}`;
    if (wwwAuth.includes("resource_metadata=")) return wwwAuth;
    return `${wwwAuth}, ${resourceMeta}`;
  }
  return async (req) => {
    let effectiveReq = req;
    if (canonicalPathname && req.url) {
      try {
        const u = new URL(req.url);
        if (u.pathname !== canonicalPathname) {
          u.pathname = canonicalPathname;
          const patchedUrl = u.toString();
          effectiveReq = new Proxy(req, {
            get(target, prop, receiver) {
              if (prop === "url") return patchedUrl;
              return Reflect.get(target, prop, receiver);
            }
          });
        }
      } catch {
      }
    }
    try {
      const res = await original(effectiveReq);
      if (res.status === 401) {
        const headers = new Headers(res.headers);
        headers.set("WWW-Authenticate", addResourceMetadata(res.headers.get("WWW-Authenticate")));
        return new Response(res.body, { status: 401, statusText: res.statusText, headers });
      }
      return res;
    } catch (err) {
      if (err instanceof OAuthInvalidTokenError) {
        return new Response(null, {
          status: 401,
          headers: {
            "WWW-Authenticate": `Bearer error="invalid_token", error_description="OAuth token is invalid or expired", resource_metadata="${prmUrl}"`,
            "Cache-Control": "no-store"
          }
        });
      }
      if (err instanceof UnauthorizedError) {
        return new Response(null, {
          status: 401,
          headers: {
            "WWW-Authenticate": `Bearer resource_metadata="${prmUrl}"`,
            "Cache-Control": "no-store"
          }
        });
      }
      throw err;
    }
  };
}

// src/plugin.ts
var SUPPORTED_MCP_RANGE = { min: [4, 0, 0], max: [4, 999, 999] };
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
};
function withCors(handler) {
  return async (req) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const res = await handler(req);
    const headers = new Headers(res.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  };
}
function resolveConfig(options) {
  const { issuer, mcpPluginOptions } = options;
  if (!issuer || typeof issuer !== "string") {
    throw new PayloadMcpOAuthError("MISSING_ISSUER", "payloadMcpOAuth: issuer is required");
  }
  let issuerUrl;
  try {
    issuerUrl = new URL(issuer);
  } catch {
    throw new PayloadMcpOAuthError("INVALID_ISSUER", `payloadMcpOAuth: issuer must be a valid URL, got "${issuer}"`);
  }
  if (process.env["NODE_ENV"] === "production" && issuerUrl.protocol !== "https:") {
    throw new PayloadMcpOAuthError(
      "INSECURE_ISSUER",
      `payloadMcpOAuth: issuer must use https:// in production, got "${issuer}"`
    );
  }
  if (!mcpPluginOptions || typeof mcpPluginOptions !== "object") {
    throw new PayloadMcpOAuthError(
      "MISSING_MCP_OPTIONS",
      "payloadMcpOAuth: mcpPluginOptions is required \u2014 pass the same options object you give to mcpPlugin()"
    );
  }
  const pepper = process.env["PMOAUTH_TOKEN_PEPPER"];
  const nodeEnv = process.env["NODE_ENV"];
  const isDevOrTest = nodeEnv === "development" || nodeEnv === "test";
  if ((!pepper || pepper.length < 32) && !isDevOrTest) {
    throw new PayloadMcpOAuthError(
      "MISSING_PEPPER",
      'PMOAUTH_TOKEN_PEPPER must be set to a string of at least 32 characters (the insecure dev fallback is only used when NODE_ENV is "development" or "test")'
    );
  }
  return {
    issuer: issuer.replace(/\/$/, ""),
    mcpPluginOptions,
    userCollection: options.userCollection ?? "users",
    adminAccess: resolveAdminAccess(options),
    accessTokenTtlSeconds: options.accessTokenTtlSeconds ?? 3600,
    refreshTokenTtlSeconds: options.refreshTokenTtlSeconds ?? 86400,
    authCodeTtlSeconds: options.authCodeTtlSeconds ?? 300,
    rateLimits: options.rateLimits ?? {}
  };
}
function resolveAdminAccess(options) {
  if (options.adminAccess) return options.adminAccess;
  const userCollection = options.userCollection ?? "users";
  return ({ req }) => req.user?.collection === userCollection;
}
function isPluginDisabled(options) {
  const mcpDisabled = Boolean(options.mcpPluginOptions?.disabled);
  return options.disabled === true || mcpDisabled;
}
function withAdminAccess(collection, adminAccess) {
  return {
    ...collection,
    access: { ...collection.access, read: adminAccess, update: adminAccess, delete: adminAccess }
  };
}
function oauthCollections(adminAccess) {
  return [
    withAdminAccess(oauthClientsCollection, adminAccess),
    oauthAuthCodesCollection,
    withAdminAccess(oauthTokensCollection, adminAccess),
    oauthCsrfNoncesCollection
  ];
}
function detectMcpEndpoints(config) {
  const endpoints = config.endpoints ?? [];
  const mcp = endpoints.filter((e2) => e2.path === "/mcp" || e2.path === "/api/mcp");
  if (mcp.length === 0) {
    throw new PayloadMcpOAuthError(
      "PLUGIN_ORDER",
      "payloadMcpOAuth must be registered AFTER mcpPlugin() in the plugins array. No /mcp endpoint found in incomingConfig \u2014 ensure mcpPlugin() runs first."
    );
  }
  return mcp;
}
function warnIfVersionUntested() {
  try {
    const pkg = __require("@payloadcms/plugin-mcp/package.json");
    const raw = pkg.version ?? "";
    const parts = raw.split(".").map(Number);
    const [major = 0, minor = 0, patch = 0] = parts;
    const [minMaj, minMin, minPatch] = SUPPORTED_MCP_RANGE.min;
    const [maxMaj, maxMin, maxPatch] = SUPPORTED_MCP_RANGE.max;
    const tooOld = major < minMaj || major === minMaj && minor < minMin || major === minMaj && minor === minMin && patch < minPatch;
    const tooNew = major > maxMaj || major === maxMaj && minor > maxMin || major === maxMaj && minor === maxMin && patch > maxPatch;
    if (tooOld || tooNew) {
      console.warn(
        `[payloadMcpOAuth] @payloadcms/plugin-mcp@${raw} is outside the tested range (${SUPPORTED_MCP_RANGE.min.join(".")}\u2013${SUPPORTED_MCP_RANGE.max.join(".")}). Proceed with caution.`
      );
    }
  } catch {
  }
}
function buildPlugin(incomingConfig, options) {
  const collections = [...incomingConfig.collections ?? [], ...oauthCollections(resolveAdminAccess(options))];
  if (isPluginDisabled(options)) {
    return { ...incomingConfig, collections };
  }
  const resolved = resolveConfig(options);
  const mcpEndpoints = detectMcpEndpoints(incomingConfig);
  warnIfVersionUntested();
  const apiBase = (incomingConfig.routes?.api ?? "/api").replace(/\/$/, "");
  for (const endpoint of mcpEndpoints) {
    if (typeof endpoint.handler === "function") {
      const endpointPath = endpoint.path.startsWith("/api/") ? endpoint.path : `${apiBase}${endpoint.path.startsWith("/") ? endpoint.path : `/${endpoint.path}`}`;
      endpoint.handler = wrapMcpEndpointHandler(endpoint.handler, resolved.issuer, endpointPath);
    }
  }
  const rateLimits = createRateLimitStore(resolved.rateLimits);
  function withRateLimit(limiter, handler) {
    return async (req) => {
      const ip = (req.headers.get?.("x-forwarded-for") ?? "").split(",")[0]?.trim();
      const key = rateLimitKey(ip);
      const allowed = limiter.check(key);
      if (!allowed) {
        return Response.json(
          { error: "too_many_requests", error_description: "Rate limit exceeded" },
          { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } }
        );
      }
      return handler(req);
    };
  }
  const corsPreflightHandler = () => new Response(null, { status: 204, headers: CORS_HEADERS });
  const oauthEndpoints = [
    {
      path: OAUTH_AS_METADATA_PATH,
      method: "get",
      handler: makeAsMetadataHandler(resolved.issuer)
    },
    {
      path: OAUTH_PRM_METADATA_PATH,
      method: "get",
      handler: makePrmMetadataHandler(resolved.issuer)
    },
    {
      path: "/oauth/register",
      method: "post",
      handler: withCors(withRateLimit(rateLimits.register, makeRegisterHandler()))
    },
    { path: "/oauth/register", method: "options", handler: corsPreflightHandler },
    {
      path: "/oauth/authorize",
      method: "get",
      handler: withRateLimit(rateLimits.authorize, makeAuthorizeHandler("/admin", void 0, `${apiBase}/oauth/consent`, resolved.mcpPluginOptions))
    },
    {
      path: "/oauth/consent",
      method: "post",
      handler: makeConsentHandler(resolved.authCodeTtlSeconds, resolved.issuer, resolved.mcpPluginOptions)
    },
    {
      path: "/oauth/token",
      method: "post",
      handler: withCors(withRateLimit(rateLimits.token, makeTokenHandler(resolved.mcpPluginOptions)))
    },
    { path: "/oauth/token", method: "options", handler: corsPreflightHandler },
    {
      path: "/oauth/revoke",
      method: "post",
      handler: withCors(withRateLimit(rateLimits.revoke, makeRevokeHandler()))
    },
    { path: "/oauth/revoke", method: "options", handler: corsPreflightHandler }
  ];
  return {
    ...incomingConfig,
    collections,
    endpoints: [...incomingConfig.endpoints ?? [], ...oauthEndpoints]
  };
}

// src/index.ts
function payloadMcpOAuth(options) {
  if (!isPluginDisabled(options) && options.mcpPluginOptions) {
    installOverrideGetAuthorizedMCP(options.mcpPluginOptions, options.userCollection ?? "users");
  }
  const fn = (incomingConfig) => buildPlugin(incomingConfig, options);
  fn.order = 20;
  return fn;
}
export {
  OAuthInvalidTokenError,
  PayloadMcpOAuthError,
  payloadMcpOAuth
};
//# sourceMappingURL=index.js.map