#!/usr/bin/env node
import { buildServer } from "./server.js";
import { ZeroGpuClient } from "./zerogpuClient.js";
import { runStdio } from "./transports/stdio.js";
import { runHttp } from "./transports/http.js";

interface ResolvedEnv {
  baseUrl: string;
  apiKey: string;
  projectId: string;
  transport: "stdio" | "http";
  host: string;
  port: number;
  bearer?: string;
}

function readEnv(): ResolvedEnv {
  const missing: string[] = [];
  const baseUrl = process.env.ZEROGPU_ORCHESTRATION_URL?.trim();
  const apiKey = process.env.ZEROGPU_API_KEY?.trim();
  const projectId = process.env.ZEROGPU_PROJECT_ID?.trim();
  if (!baseUrl) missing.push("ZEROGPU_ORCHESTRATION_URL");
  if (!apiKey) missing.push("ZEROGPU_API_KEY");
  if (!projectId) missing.push("ZEROGPU_PROJECT_ID");
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  const transportRaw = (process.env.ZEROGPU_MCP_TRANSPORT ?? "stdio").toLowerCase();
  if (transportRaw !== "stdio" && transportRaw !== "http") {
    throw new Error(`ZEROGPU_MCP_TRANSPORT must be "stdio" or "http" (got "${transportRaw}").`);
  }

  const host = process.env.ZEROGPU_MCP_HTTP_HOST?.trim() || "127.0.0.1";
  const portRaw = process.env.ZEROGPU_MCP_HTTP_PORT?.trim() || "3987";
  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    throw new Error(`ZEROGPU_MCP_HTTP_PORT must be a valid port (got "${portRaw}").`);
  }
  const bearer = process.env.ZEROGPU_MCP_HTTP_BEARER?.trim() || undefined;

  return {
    baseUrl: baseUrl!,
    apiKey: apiKey!,
    projectId: projectId!,
    transport: transportRaw,
    host,
    port,
    bearer,
  };
}

async function main(): Promise<void> {
  const env = readEnv();
  const client = new ZeroGpuClient({
    baseUrl: env.baseUrl,
    apiKey: env.apiKey,
    projectId: env.projectId,
  });
  const server = buildServer({ client });

  if (env.transport === "stdio") {
    await runStdio(server);
  } else {
    await runHttp(server, { host: env.host, port: env.port, bearer: env.bearer });
  }
}

main().catch((err) => {
  process.stderr.write(
    `${JSON.stringify({ kind: "zerogpu.fatal", message: (err as Error).message })}\n`,
  );
  process.exit(1);
});
