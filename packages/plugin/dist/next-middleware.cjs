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

// src/next-middleware.ts
var next_middleware_exports = {};
__export(next_middleware_exports, {
  config: () => config,
  createMcpOAuthMiddleware: () => createMcpOAuthMiddleware,
  mcpOAuthMiddleware: () => mcpOAuthMiddleware
});
module.exports = __toCommonJS(next_middleware_exports);
var import_server = require("next/server");

// src/lib/paths.ts
var OAUTH_AS_METADATA_PATH = "/.well-known/oauth-authorization-server";
var OAUTH_PRM_METADATA_PATH = "/.well-known/oauth-protected-resource";
var OAUTH_DISCOVERY_PATHS = [OAUTH_AS_METADATA_PATH, OAUTH_PRM_METADATA_PATH];

// src/next-middleware.ts
var DISCOVERY_PATHS = new Set(OAUTH_DISCOVERY_PATHS);
function looksLikeMcpClient(request) {
  const accept = request.headers.get("accept") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.includes("application/json") && accept.includes("text/event-stream");
}
function createMcpOAuthMiddleware(options = {}) {
  const apiRoute = (options.apiRoute ?? "/api").replace(/\/$/, "");
  const mcpEndpointPath = options.mcpEndpointPath ?? `${apiRoute}/mcp`;
  const rewriteBareHostMcp = options.rewriteBareHostMcp ?? true;
  const rewriteWellKnown = options.rewriteWellKnown ?? true;
  return function mcpOAuthMiddleware2(request) {
    const { method, nextUrl } = request;
    const { pathname } = nextUrl;
    if (rewriteWellKnown && DISCOVERY_PATHS.has(pathname)) {
      const rewritten = nextUrl.clone();
      rewritten.pathname = `${apiRoute}${pathname}`;
      return import_server.NextResponse.rewrite(rewritten);
    }
    if (rewriteBareHostMcp && pathname === "/" && method === "POST" && looksLikeMcpClient(request)) {
      const rewritten = nextUrl.clone();
      rewritten.pathname = mcpEndpointPath;
      return import_server.NextResponse.rewrite(rewritten);
    }
    return import_server.NextResponse.next();
  };
}
var mcpOAuthMiddleware = createMcpOAuthMiddleware();
var config = {
  matcher: [
    "/",
    "/.well-known/oauth-authorization-server",
    "/.well-known/oauth-protected-resource"
  ]
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  config,
  createMcpOAuthMiddleware,
  mcpOAuthMiddleware
});
//# sourceMappingURL=next-middleware.cjs.map