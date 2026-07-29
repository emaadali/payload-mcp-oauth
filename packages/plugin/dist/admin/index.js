import "../chunk-DGUM43GV.js";

// src/admin/ConsentScreen.tsx
import { jsx, jsxs } from "react/jsx-runtime";
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
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      /* @__PURE__ */ jsx("title", { children: `Authorize ${clientName}` }),
      /* @__PURE__ */ jsx("style", { children: `
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
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsxs("h1", { children: [
        "Authorize ",
        /* @__PURE__ */ jsx("strong", { children: clientName })
      ] }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Approving will let ",
        /* @__PURE__ */ jsx("strong", { children: clientName }),
        " access your Payload CMS instance",
        " ",
        /* @__PURE__ */ jsx("strong", { children: "acting as you" }),
        ". The following will be granted:"
      ] }),
      /* @__PURE__ */ jsx("ul", { className: "scope-list", children: labels.map((label) => /* @__PURE__ */ jsx("li", { children: label }, label)) }),
      /* @__PURE__ */ jsx("p", { className: "note", children: "Only approve applications you trust." }),
      /* @__PURE__ */ jsxs("form", { method: "POST", action: "/api/oauth/consent", children: [
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "client_id", value: clientId }),
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "redirect_uri", value: redirectUri }),
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "code_challenge", value: codeChallenge }),
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "code_challenge_method", value: codeChallengeMethod }),
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "state", value: state }),
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "user_id", value: userId }),
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "scope", value: scope }),
        /* @__PURE__ */ jsxs("div", { className: "actions", children: [
          /* @__PURE__ */ jsx("button", { type: "submit", name: "decision", value: "approve", className: "btn btn-approve", children: "Approve" }),
          /* @__PURE__ */ jsx("button", { type: "submit", name: "decision", value: "deny", className: "btn btn-deny", children: "Deny" })
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
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
async function TokensView({ initPageResult }) {
  const { user, payload } = initPageResult.req;
  if (!user) {
    return /* @__PURE__ */ jsxs2("div", { children: [
      /* @__PURE__ */ jsx2("h1", { children: "Active OAuth Tokens" }),
      /* @__PURE__ */ jsx2("p", { children: "You must be logged in to view this page." })
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
  return /* @__PURE__ */ jsxs2("div", { style: { padding: "2rem" }, children: [
    /* @__PURE__ */ jsx2("h1", { children: "Active OAuth Tokens" }),
    tokens.length === 0 ? /* @__PURE__ */ jsx2("p", { children: "No active tokens found." }) : /* @__PURE__ */ jsxs2("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
      /* @__PURE__ */ jsx2("thead", { children: /* @__PURE__ */ jsxs2("tr", { children: [
        /* @__PURE__ */ jsx2("th", { style: thStyle, children: "Type" }),
        /* @__PURE__ */ jsx2("th", { style: thStyle, children: "Client ID" }),
        /* @__PURE__ */ jsx2("th", { style: thStyle, children: "Scope" }),
        /* @__PURE__ */ jsx2("th", { style: thStyle, children: "Expires" }),
        /* @__PURE__ */ jsx2("th", { style: thStyle, children: "Last Used" }),
        /* @__PURE__ */ jsx2("th", { style: thStyle, children: "Action" })
      ] }) }),
      /* @__PURE__ */ jsx2("tbody", { children: tokens.map((token) => /* @__PURE__ */ jsxs2("tr", { children: [
        /* @__PURE__ */ jsx2("td", { style: tdStyle, children: token.tokenType }),
        /* @__PURE__ */ jsx2("td", { style: tdStyle, children: token.clientId }),
        /* @__PURE__ */ jsx2("td", { style: tdStyle, children: token.scope || "\u2014" }),
        /* @__PURE__ */ jsx2("td", { style: tdStyle, children: new Date(token.expiresAt).toLocaleString() }),
        /* @__PURE__ */ jsx2("td", { style: tdStyle, children: token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString() : "\u2014" }),
        /* @__PURE__ */ jsx2("td", { style: tdStyle, children: /* @__PURE__ */ jsxs2("form", { method: "POST", action: "/api/oauth/revoke", children: [
          /* @__PURE__ */ jsx2("input", { type: "hidden", name: "token_id", value: token.id }),
          /* @__PURE__ */ jsx2("button", { type: "submit", style: revokeStyle, children: "Revoke" })
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
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
async function ClientsView({ initPageResult }) {
  const { user, payload } = initPageResult.req;
  if (!user) {
    return /* @__PURE__ */ jsxs3("div", { style: { padding: "2rem" }, children: [
      /* @__PURE__ */ jsx3("h1", { children: "OAuth Clients" }),
      /* @__PURE__ */ jsx3("p", { children: "You must be logged in to view this page." })
    ] });
  }
  if (!isOAuthAdmin(user)) {
    return /* @__PURE__ */ jsxs3("div", { style: { padding: "2rem" }, children: [
      /* @__PURE__ */ jsx3("h1", { children: "OAuth Clients" }),
      /* @__PURE__ */ jsx3("p", { style: { color: "#dc2626" }, children: "Access denied. Admin privileges required." })
    ] });
  }
  const { docs } = await payload.find({
    collection: "oauth-clients",
    limit: 200,
    sort: "-createdAt"
  });
  const clients = docs;
  return /* @__PURE__ */ jsxs3("div", { style: { padding: "2rem" }, children: [
    /* @__PURE__ */ jsx3("h1", { children: "OAuth Clients" }),
    /* @__PURE__ */ jsxs3("p", { style: { color: "#666", marginBottom: "1.5rem" }, children: [
      clients.length,
      " registered client",
      clients.length !== 1 ? "s" : ""
    ] }),
    clients.length === 0 ? /* @__PURE__ */ jsx3("p", { children: "No clients registered yet." }) : /* @__PURE__ */ jsxs3("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
      /* @__PURE__ */ jsx3("thead", { children: /* @__PURE__ */ jsxs3("tr", { children: [
        /* @__PURE__ */ jsx3("th", { style: thStyle2, children: "Client Name" }),
        /* @__PURE__ */ jsx3("th", { style: thStyle2, children: "Client ID" }),
        /* @__PURE__ */ jsx3("th", { style: thStyle2, children: "Redirect URIs" }),
        /* @__PURE__ */ jsx3("th", { style: thStyle2, children: "Status" }),
        /* @__PURE__ */ jsx3("th", { style: thStyle2, children: "Last Used" }),
        /* @__PURE__ */ jsx3("th", { style: thStyle2, children: "Actions" })
      ] }) }),
      /* @__PURE__ */ jsx3("tbody", { children: clients.map((client) => /* @__PURE__ */ jsxs3("tr", { children: [
        /* @__PURE__ */ jsx3("td", { style: tdStyle2, children: /* @__PURE__ */ jsx3("strong", { children: client.clientName }) }),
        /* @__PURE__ */ jsx3("td", { style: { ...tdStyle2, fontFamily: "monospace", fontSize: "0.85rem" }, children: client.clientId }),
        /* @__PURE__ */ jsx3("td", { style: tdStyle2, children: /* @__PURE__ */ jsx3("ul", { style: { margin: 0, padding: "0 0 0 1.2rem" }, children: client.redirectUris.map((uri) => /* @__PURE__ */ jsx3("li", { style: { fontSize: "0.85rem" }, children: uri }, uri)) }) }),
        /* @__PURE__ */ jsx3("td", { style: tdStyle2, children: /* @__PURE__ */ jsx3("span", { style: { color: client.isActive ? "#16a34a" : "#dc2626", fontWeight: 600 }, children: client.isActive ? "Active" : "Inactive" }) }),
        /* @__PURE__ */ jsx3("td", { style: tdStyle2, children: client.lastUsedAt ? new Date(client.lastUsedAt).toLocaleString() : "\u2014" }),
        /* @__PURE__ */ jsx3("td", { style: tdStyle2, children: /* @__PURE__ */ jsx3("form", { method: "POST", action: `/api/oauth/clients/${client.clientId}/toggle`, style: { display: "inline" }, children: /* @__PURE__ */ jsx3("button", { type: "submit", style: toggleStyle(client.isActive), children: client.isActive ? "Deactivate" : "Activate" }) }) })
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
export {
  ClientsView,
  ConsentScreen,
  TokensView
};
//# sourceMappingURL=index.js.map