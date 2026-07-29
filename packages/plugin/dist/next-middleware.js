import {
  OAUTH_DISCOVERY_PATHS
} from "./chunk-V7W6RYWW.js";
import "./chunk-DGUM43GV.js";

// src/next-middleware.ts
import { NextResponse } from "next/server";
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
      return NextResponse.rewrite(rewritten);
    }
    if (rewriteBareHostMcp && pathname === "/" && method === "POST" && looksLikeMcpClient(request)) {
      const rewritten = nextUrl.clone();
      rewritten.pathname = mcpEndpointPath;
      return NextResponse.rewrite(rewritten);
    }
    return NextResponse.next();
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
export {
  config,
  createMcpOAuthMiddleware,
  mcpOAuthMiddleware
};
//# sourceMappingURL=next-middleware.js.map