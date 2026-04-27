import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SERVER_INFO, registerTools } from "./server.js";
import { ZeroGpuClient } from "./zerogpuClient.js";
import { KvConfigProvider } from "./config.js";

export interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  ZEROGPU_CONFIG: KVNamespace;
  ZEROGPU_ORCHESTRATION_URL: string;
  ZEROGPU_MCP_ENV?: string;
  ZEROGPU_CONFIG_TTL_MS?: string;
}

interface ZeroGpuProps extends Record<string, unknown> {
  apiKey: string;
  projectId: string;
}

// The DO uses WebSocket Hibernation API (via `webSocketMessage` / `webSocketClose`
// implemented on the McpAgent base class). The runtime unloads the DO when the
// WebSocket is idle and rehydrates only on the next incoming event — so per-tool
// traffic does not hold the DO active and compute costs stay minimal.
export class ZeroGpuMcp extends McpAgent<Env, unknown, ZeroGpuProps> {
  server = new McpServer(SERVER_INFO);

  async init(): Promise<void> {
    if (!this.env.ZEROGPU_ORCHESTRATION_URL) {
      throw new Error("Missing required secret: ZEROGPU_ORCHESTRATION_URL");
    }
    if (!this.env.ZEROGPU_CONFIG) {
      throw new Error("Missing required binding: ZEROGPU_CONFIG (KV namespace)");
    }
    if (!this.props?.apiKey || !this.props?.projectId) {
      throw new Error(
        "Missing per-request credentials: x-api-key and x-project-id headers are required on session initialization",
      );
    }

    const client = new ZeroGpuClient({
      baseUrl: this.env.ZEROGPU_ORCHESTRATION_URL,
      apiKey: this.props.apiKey,
      projectId: this.props.projectId,
    });

    const ttlMs = this.env.ZEROGPU_CONFIG_TTL_MS
      ? Math.max(0, Number.parseInt(this.env.ZEROGPU_CONFIG_TTL_MS, 10) || 0)
      : undefined;

    const configProvider = new KvConfigProvider({ kv: this.env.ZEROGPU_CONFIG, ttlMs });
    const config = await configProvider.getConfig();
    registerTools(this.server, { client, configProvider }, config.tools);
  }
}

function jsonRpcError(status: number, message: string, code: number): Response {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null }),
    { status, headers: { "content-type": "application/json" } },
  );
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/health" && req.method === "GET") {
      return new Response(
        JSON.stringify({ status: "ok", env: env.ZEROGPU_MCP_ENV ?? "local" }),
        { headers: { "content-type": "application/json" } },
      );
    }

    if (url.pathname !== "/mcp") {
      return new Response("not found", { status: 404 });
    }

    const apiKey = req.headers.get("x-api-key")?.trim() ?? "";
    const projectId = req.headers.get("x-project-id")?.trim() ?? "";
    if (!apiKey || !projectId) {
      return jsonRpcError(
        400,
        "missing required headers: x-api-key and x-project-id",
        -32602,
      );
    }

    (ctx as ExecutionContext & { props?: ZeroGpuProps }).props = { apiKey, projectId };

    return ZeroGpuMcp.serve("/mcp").fetch(req, env, ctx);
  },
};
