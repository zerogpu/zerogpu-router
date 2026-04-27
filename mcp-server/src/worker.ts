/**
 * @fileoverview Cloudflare Workers entry point for the ZeroGPU MCP server.
 *
 * Deploys the same MCP server logic to Cloudflare Workers as a Durable Object,
 * adding:
 * - HTTP transport (instead of stdio)
 * - Bearer token authentication on /mcp endpoint
 * - Config storage in Cloudflare KV (instead of local file)
 * - WebSocket hibernation for efficient resource usage
 *
 * Architecture:
 * - Default export: Main fetch handler (dispatcher for /health and /mcp routes)
 * - ZeroGpuMcp class: Durable Object that extends McpAgent (holds MCP session state)
 * - Each MCP client session maps to one Durable Object instance (stateful)
 */

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SERVER_INFO, registerTools } from "./server.js";
import { ZeroGpuClient } from "./zerogpuClient.js";
import { KvConfigProvider } from "./config.js";

/**
 * Cloudflare Worker environment bindings.
 * These are configured in wrangler.toml and provided to the fetch handler.
 */
export interface Env {
  MCP_OBJECT: DurableObjectNamespace;         // Binding to the ZeroGpuMcp Durable Object
  ZEROGPU_CONFIG: KVNamespace;                // KV namespace with tool configuration
  ZEROGPU_ORCHESTRATION_URL: string;          // Secret: ZeroGPU API base URL
  ZEROGPU_MCP_ENV?: string;                   // Optional: environment name (develop/staging/production)
  ZEROGPU_CONFIG_TTL_MS?: string;             // Optional: KV cache TTL in milliseconds
  // Note: ZEROGPU_API_KEY and ZEROGPU_PROJECT_ID are per-request (passed in headers),
  // not pre-configured secrets (unlike Node entry)
}

/**
 * Per-request properties passed to the ZeroGpuMcp Durable Object.
 * Extracted from request headers and attached by the fetch handler.
 * This is how API credentials get into the DO's init() method.
 */
interface ZeroGpuProps extends Record<string, unknown> {
  apiKey: string;     // From x-api-key header
  projectId: string;  // From x-project-id header
}

/**
 * MCP Server Durable Object for Cloudflare Workers.
 *
 * A Durable Object is a serverless-style actor: one instance per session, persistent
 * across requests, with access to durable storage. The mcpAgent base class handles:
 * - WebSocket connection lifecycle
 * - JSON-RPC message routing
 * - Session state persistence
 *
 * WebSocket Hibernation: The runtime can unload this DO when its WebSocket is idle,
 * and rehydrate it on the next incoming message. This keeps compute costs minimal since
 * the DO doesn't consume resources while waiting between tool calls. The MCP client
 * maintains the WebSocket connection, so hibernation is transparent to it.
 *
 * Why a Durable Object: MCP sessions are stateful (they track tools, context, etc.).
 * A DO provides the right abstraction for per-session state. An alternative would be
 * to keep state in KV or request-local cache, but that would be more complex.
 */
export class ZeroGpuMcp extends McpAgent<Env, unknown, ZeroGpuProps> {
  // The MCP server instance (holds registered tools and handlers)
  server = new McpServer(SERVER_INFO);

  /**
   * Initializes the Durable Object when a new session is created.
   *
   * Called once per DO instance (per MCP session). Sets up:
   * 1. Validate that all required environment secrets are present
   * 2. Validate that per-request credentials (apiKey, projectId) were provided
   * 3. Create a ZeroGpuClient configured with the credentials
   * 4. Create a KvConfigProvider to load tools from KV storage
   * 5. Register all tools into the MCP server
   *
   * Why validate in init(): Catches misconfiguration early (at session start) rather
   * than on the first tool call. Clearer error messages for debugging.
   *
   * @throws {Error} If any required secret, binding, or credential is missing
   */
  async init(): Promise<void> {
    // Validate required environment secrets
    if (!this.env.ZEROGPU_ORCHESTRATION_URL) {
      throw new Error("Missing required secret: ZEROGPU_ORCHESTRATION_URL");
    }
    if (!this.env.ZEROGPU_CONFIG) {
      throw new Error("Missing required binding: ZEROGPU_CONFIG (KV namespace)");
    }

    // Validate per-request credentials (passed in headers)
    if (!this.props?.apiKey || !this.props?.projectId) {
      throw new Error(
        "Missing per-request credentials: x-api-key and x-project-id headers are required on session initialization",
      );
    }

    // Create ZeroGPU API client with the provided credentials
    const client = new ZeroGpuClient({
      baseUrl: this.env.ZEROGPU_ORCHESTRATION_URL,
      apiKey: this.props.apiKey,
      projectId: this.props.projectId,
    });

    // Parse optional config TTL (cache expiration for KV-fetched tool config)
    // Default: no cache (fetch fresh on every access). Override with ZEROGPU_CONFIG_TTL_MS.
    const ttlMs = this.env.ZEROGPU_CONFIG_TTL_MS
      ? Math.max(0, Number.parseInt(this.env.ZEROGPU_CONFIG_TTL_MS, 10) || 0)
      : undefined;

    // Create config provider that reads tool definitions from KV storage
    const configProvider = new KvConfigProvider({ kv: this.env.ZEROGPU_CONFIG, ttlMs });
    const config = await configProvider.getConfig();

    // Register all tools into the MCP server
    registerTools(this.server, { client, configProvider }, config.tools);
  }
}

/**
 * Helper to create a JSON-RPC error response.
 *
 * Format: { jsonrpc: "2.0", error: { code, message }, id: null }
 * This matches the JSON-RPC 2.0 spec for error responses.
 *
 * Why separate function: Consistent error response format across all error cases.
 *
 * @param status HTTP status code (e.g., 400, 401)
 * @param message Human-readable error message
 * @param code JSON-RPC error code (e.g., -32602 for invalid params)
 * @returns Response object with JSON-RPC error
 */
function jsonRpcError(status: number, message: string, code: number): Response {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null }),
    { status, headers: { "content-type": "application/json" } },
  );
}

/**
 * Cloudflare Workers fetch handler (main entry point).
 *
 * Routes incoming requests based on path:
 * - GET /health: Returns { status: "ok", env: "..." } without auth
 * - POST /mcp: MCP session endpoint (requires x-api-key and x-project-id headers)
 * - Other: Returns 404
 *
 * Authentication: The /mcp endpoint requires x-api-key and x-project-id headers.
 * These are per-request credentials (not pre-configured like in the Node entry).
 * They're validated here and passed to the DO's init() method via the ExecutionContext props.
 *
 * Flow:
 * 1. Parse URL and check path
 * 2. For /health: immediate response (no auth needed)
 * 3. For /mcp: extract credentials from headers
 * 4. If credentials missing: return 400 with JSON-RPC error
 * 5. If credentials present: attach to context, delegate to ZeroGpuMcp.serve()
 *    - ZeroGpuMcp.serve() creates or retrieves the DO instance and routes the request to it
 *
 * Why /health unauth: Monitoring and load balancing need to check health without credentials.
 * Why /mcp has auth: Prevents unauthorized access to the tool endpoints.
 *
 * @param req Incoming HTTP request
 * @param env Cloudflare environment bindings (secrets, KV, Durable Object namespace)
 * @param ctx Execution context (used to attach props to the DO)
 * @returns HTTP response
 */
export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    // Health check endpoint (no auth required, for monitoring)
    if (url.pathname === "/health" && req.method === "GET") {
      return new Response(
        JSON.stringify({ status: "ok", env: env.ZEROGPU_MCP_ENV ?? "local" }),
        { headers: { "content-type": "application/json" } },
      );
    }

    // MCP endpoint must be at /mcp
    if (url.pathname !== "/mcp") {
      return new Response("not found", { status: 404 });
    }

    // Extract and validate API credentials from request headers
    const apiKey = req.headers.get("x-api-key")?.trim() ?? "";
    const projectId = req.headers.get("x-project-id")?.trim() ?? "";
    if (!apiKey || !projectId) {
      return jsonRpcError(
        400,
        "missing required headers: x-api-key and x-project-id",
        -32602, // JSON-RPC error code for invalid params
      );
    }

    // Attach credentials to the execution context so they're passed to the DO's init()
    // This allows the DO to create a client with the provided credentials
    (ctx as ExecutionContext & { props?: ZeroGpuProps }).props = { apiKey, projectId };

    // Delegate to the ZeroGpuMcp Durable Object
    // ZeroGpuMcp.serve() creates or retrieves the DO instance and routes the request to it
    return ZeroGpuMcp.serve("/mcp").fetch(req, env, ctx);
  },
};
