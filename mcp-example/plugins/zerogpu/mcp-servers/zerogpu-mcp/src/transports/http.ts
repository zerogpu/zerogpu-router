import { randomUUID } from "node:crypto";
import express, { type Request, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface HttpConfig {
  host: string;
  port: number;
  bearer?: string;
}

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

export async function runHttp(server: McpServer, config: HttpConfig): Promise<void> {
  if (!LOOPBACK_HOSTS.has(config.host) && !config.bearer) {
    throw new Error(
      "ZEROGPU_MCP_HTTP_BEARER is required when binding to a non-loopback host.",
    );
  }

  const app = express();
  app.use(express.json({ limit: "4mb" }));

  const sessions = new Map<string, StreamableHTTPServerTransport>();

  const auth = (req: Request, res: Response, next: () => void): void => {
    if (!config.bearer) return next();
    const header = req.header("authorization") ?? "";
    const expected = `Bearer ${config.bearer}`;
    if (header !== expected) {
      res.status(401).json({ jsonrpc: "2.0", error: { code: -32001, message: "unauthorized" }, id: null });
      return;
    }
    next();
  };

  app.post("/mcp", auth, async (req: Request, res: Response) => {
    try {
      const sessionId = req.header("mcp-session-id");
      let transport: StreamableHTTPServerTransport | undefined = sessionId
        ? sessions.get(sessionId)
        : undefined;

      if (!transport && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true,
          onsessioninitialized: (id) => {
            if (transport) sessions.set(id, transport);
          },
        });
        transport.onclose = () => {
          if (transport?.sessionId) sessions.delete(transport.sessionId);
        };
        await server.connect(transport);
      }

      if (!transport) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Session not initialized. Send initialize first." },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: (err as Error).message },
          id: null,
        });
      }
    }
  });

  const methodNotAllowed = (_req: Request, res: Response): void => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed (JSON-only transport)." },
      id: null,
    });
  };
  app.get("/mcp", auth, methodNotAllowed);
  app.delete("/mcp", auth, methodNotAllowed);

  await new Promise<void>((resolve) => {
    app.listen(config.port, config.host, () => {
      process.stderr.write(
        `${JSON.stringify({
          kind: "zerogpu.boot",
          transport: "http",
          host: config.host,
          port: config.port,
          bearer: Boolean(config.bearer),
        })}\n`,
      );
      resolve();
    });
  });
}
