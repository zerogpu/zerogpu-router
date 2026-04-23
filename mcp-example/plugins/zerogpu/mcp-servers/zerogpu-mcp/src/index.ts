#!/usr/bin/env node
import { buildServer } from "./server.js";
import { ZeroGpuClient } from "./zerogpuClient.js";
import { runStdio } from "./transports/stdio.js";

interface ResolvedEnv {
  baseUrl: string;
  apiKey: string;
  projectId: string;
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
  return { baseUrl: baseUrl!, apiKey: apiKey!, projectId: projectId! };
}

async function main(): Promise<void> {
  const env = readEnv();
  const client = new ZeroGpuClient({
    baseUrl: env.baseUrl,
    apiKey: env.apiKey,
    projectId: env.projectId,
  });
  const server = buildServer({ client });
  await runStdio(server);
}

main().catch((err) => {
  process.stderr.write(
    `${JSON.stringify({ kind: "zerogpu.fatal", message: (err as Error).message })}\n`,
  );
  process.exit(1);
});
