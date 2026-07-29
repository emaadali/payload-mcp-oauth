"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/admin/index.ts
var admin_exports = {};
__export(admin_exports, {
  ClientsView: () => ClientsView,
  ConsentScreen: () => ConsentScreen,
  TokensView: () => TokensView
});
module.exports = __toCommonJS(admin_exports);

// src/admin/ConsentScreen.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function scopeToLabel(scope) {
  const MAP = {
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
  return MAP[scope] ?? scope;
}
function deriveScopeLabels(rawScope) {
  if (!rawScope.trim()) return ["Access your Payload CMS instance"];
  return rawScope.split(/\s+/).filter(Boolean).map(scopeToLabel);
}
function ConsentScreen({
  clientName,
  scope,
  clientId,
  redirectUri,
  codeChallenge,
  codeChallengeMethod,
  state,
  userId,
  scopeLabels
}) {
  const labels = scopeLabels ?? deriveScopeLabels(scope);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", { lang: "en", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("head", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("title", { children: `Authorize ${clientName}` }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `
          body { font-family: system-ui, sans-serif; max-width: 480px; margin: 80px auto; padding: 0 1rem; }
          h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
          .scope-list { list-style: disc; padding-left: 1.5rem; margin: 1rem 0; }
          .note { font-size: 0.85rem; color: #555; background: #f7f7f7; border-left: 3px solid #d0d0d0; padding: 0.6rem 0.8rem; margin: 1rem 0; }
          .actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
          .btn { padding: 0.5rem 1.25rem; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; }
          .btn-approve { background: #0070f3; color: #fff; }
          .btn-deny { background: #f0f0f0; color: #333; }
        ` })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [
        "Authorize ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: clientName })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
        "Approving will let ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: clientName }),
        " access your Payload CMS instance",
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "acting as you" }),
        ". The following will be granted:"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "scope-list", children: labels.map((label) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: label }, label)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "note", children: "Only approve applications you trust." }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { method: "POST", action: "/api/oauth/consent", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "hidden", name: "client_id", value: clientId }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "hidden", name: "redirect_uri", value: redirectUri }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "hidden", name: "code_challenge", value: codeChallenge }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "hidden", name: "code_challenge_method", value: codeChallengeMethod }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "hidden", name: "state", value: state }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "hidden", name: "user_id", value: userId }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "hidden", name: "scope", value: scope }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", name: "decision", value: "approve", className: "btn btn-approve", children: "Approve" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", name: "decision", value: "deny", className: "btn btn-deny", children: "Deny" })
        ] })
      ] })
    ] })
  ] });
}

// src/admin/is-admin.ts
function isOAuthAdmin(user) {
  const u = user;
  if ("role" in u) return u["role"] === "admin";
  if ("isAdmin" in u) return u["isAdmin"] === true;
  if (Array.isArray(u["roles"])) return u["roles"].includes("admin");
  return true;
}

// src/admin/TokensView.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
async function TokensView({ initPageResult }) {
  const { user, payload } = initPageResult.req;
  if (!user) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h1", { children: "Active OAuth Tokens" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "You must be logged in to view this page." })
    ] });
  }
  const userId = String(user["id"] ?? "");
  const isAdmin = isOAuthAdmin(user);
  const whereClause = isAdmin ? { revokedAt: { equals: null } } : { and: [{ userId: { equals: userId } }, { revokedAt: { equals: null } }] };
  const { docs } = await payload.find({
    collection: "oauth-tokens",
    where: whereClause,
    limit: 100,
    sort: "-createdAt"
  });
  const tokens = docs;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { padding: "2rem" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h1", { children: "Active OAuth Tokens" }),
    tokens.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "No active tokens found." }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: thStyle, children: "Type" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: thStyle, children: "Client ID" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: thStyle, children: "Scope" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: thStyle, children: "Expires" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: thStyle, children: "Last Used" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: thStyle, children: "Action" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tbody", { children: tokens.map((token) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: tdStyle, children: token.tokenType }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: tdStyle, children: token.clientId }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: tdStyle, children: token.scope || "\u2014" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: tdStyle, children: new Date(token.expiresAt).toLocaleString() }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: tdStyle, children: token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString() : "\u2014" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: tdStyle, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("form", { method: "POST", action: "/api/oauth/revoke", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { type: "hidden", name: "token_id", value: token.id }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "submit", style: revokeStyle, children: "Revoke" })
        ] }) })
      ] }, token.id)) })
    ] })
  ] });
}
var thStyle = {
  textAlign: "left",
  padding: "0.5rem 0.75rem",
  borderBottom: "2px solid #e0e0e0",
  fontWeight: 600
};
var tdStyle = {
  padding: "0.5rem 0.75rem",
  borderBottom: "1px solid #f0f0f0"
};
var revokeStyle = {
  padding: "0.25rem 0.75rem",
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer"
};

// src/admin/ClientsView.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
async function ClientsView({ initPageResult }) {
  const { user, payload } = initPageResult.req;
  if (!user) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { padding: "2rem" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h1", { children: "OAuth Clients" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: "You must be logged in to view this page." })
    ] });
  }
  if (!isOAuthAdmin(user)) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { padding: "2rem" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h1", { children: "OAuth Clients" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { style: { color: "#dc2626" }, children: "Access denied. Admin privileges required." })
    ] });
  }
  const { docs } = await payload.find({
    collection: "oauth-clients",
    limit: 200,
    sort: "-createdAt"
  });
  const clients = docs;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { padding: "2rem" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h1", { children: "OAuth Clients" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { style: { color: "#666", marginBottom: "1.5rem" }, children: [
      clients.length,
      " registered client",
      clients.length !== 1 ? "s" : ""
    ] }),
    clients.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: "No clients registered yet." }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { style: thStyle2, children: "Client Name" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { style: thStyle2, children: "Client ID" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { style: thStyle2, children: "Redirect URIs" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { style: thStyle2, children: "Status" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { style: thStyle2, children: "Last Used" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { style: thStyle2, children: "Actions" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("tbody", { children: clients.map((client) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { style: tdStyle2, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: client.clientName }) }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { style: { ...tdStyle2, fontFamily: "monospace", fontSize: "0.85rem" }, children: client.clientId }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { style: tdStyle2, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ul", { style: { margin: 0, padding: "0 0 0 1.2rem" }, children: client.redirectUris.map((uri) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("li", { style: { fontSize: "0.85rem" }, children: uri }, uri)) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { style: tdStyle2, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { color: client.isActive ? "#16a34a" : "#dc2626", fontWeight: 600 }, children: client.isActive ? "Active" : "Inactive" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { style: tdStyle2, children: client.lastUsedAt ? new Date(client.lastUsedAt).toLocaleString() : "\u2014" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { style: tdStyle2, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("form", { method: "POST", action: `/api/oauth/clients/${client.clientId}/toggle`, style: { display: "inline" }, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "submit", style: toggleStyle(client.isActive), children: client.isActive ? "Deactivate" : "Activate" }) }) })
      ] }, client.id)) })
    ] })
  ] });
}
var thStyle2 = {
  textAlign: "left",
  padding: "0.5rem 0.75rem",
  borderBottom: "2px solid #e0e0e0",
  fontWeight: 600
};
var tdStyle2 = {
  padding: "0.5rem 0.75rem",
  borderBottom: "1px solid #f0f0f0",
  verticalAlign: "top"
};
function toggleStyle(active) {
  return {
    padding: "0.25rem 0.75rem",
    background: active ? "#f59e0b" : "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: "0.85rem"
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ClientsView,
  ConsentScreen,
  TokensView
});
//# sourceMappingURL=index.cjs.map