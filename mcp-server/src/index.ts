#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { resolve as pathResolve, dirname } from "node:path";
import { buildServer } from "./server.js";
import { ZeroGpuClient } from "./zerogpuClient.js";
import { loadConfigFromFile } from "./configFile.js";
import { runStdio } from "./transports/stdio.js";

interface ResolvedEnv {
  baseUrl: string;
  apiKey: string;
  projectId: string;
  configPath: string;
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
  // Catalog lives next to the compiled bundle by default (dist/../config/catalog.json).
  // Override with ZEROGPU_CONFIG_PATH for custom deployments.
  const here = dirname(fileURLToPath(import.meta.url));
  const defaultPath = pathResolve(here, "..", "config", "catalog.json");
  const configPath = process.env.ZEROGPU_CONFIG_PATH?.trim() || defaultPath;

  return { baseUrl: baseUrl!, apiKey: apiKey!, projectId: projectId!, configPath };
}

async function main(): Promise<void> {
  const env = readEnv();
  const client = new ZeroGpuClient({
    baseUrl: env.baseUrl,
    apiKey: env.apiKey,
    projectId: env.projectId,
  });
  const configProvider = await loadConfigFromFile(env.configPath);
  const server = await buildServer({ client, configProvider });
  await runStdio(server);
}

main().catch((err) => {
  process.stderr.write(
    `${JSON.stringify({ kind: "zerogpu.fatal", message: (err as Error).message })}\n`,
  );
  process.exit(1);
});
