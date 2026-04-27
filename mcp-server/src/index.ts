#!/usr/bin/env node
/**
 * @fileoverview Node.js entry point for the ZeroGPU MCP server.
 *
 * This is the main entry point when Claude Code spawns the server as a child process
 * using the stdio transport. It:
 * 1. Reads required ZeroGPU credentials from environment variables
 * 2. Loads the tool configuration (either from file or default location)
 * 3. Builds the MCP server with tool handlers
 * 4. Connects the server to stdin/stdout for communication with the MCP client
 *
 * Environment variables required:
 * - ZEROGPU_ORCHESTRATION_URL: Base URL of the ZeroGPU API
 * - ZEROGPU_API_KEY: Authentication key for ZeroGPU API
 * - ZEROGPU_PROJECT_ID: Project identifier for ZeroGPU API
 * - ZEROGPU_CONFIG_PATH: (optional) Path to tool configuration file; defaults to dist/../config/catalog.json
 */

import { fileURLToPath } from "node:url";
import { resolve as pathResolve, dirname } from "node:path";
import { buildServer } from "./server.js";
import { ZeroGpuClient } from "./zerogpuClient.js";
import { loadConfigFromFile } from "./configFile.js";
import { runStdio } from "./transports/stdio.js";

/**
 * Resolved environment configuration with all required credentials and paths.
 * This is the internal representation after validation and path resolution.
 */
interface ResolvedEnv {
  baseUrl: string;
  apiKey: string;
  projectId: string;
  configPath: string;
}

/**
 * Reads and validates required environment variables for ZeroGPU API access.
 *
 * Enforces that all three credentials (baseUrl, apiKey, projectId) are present
 * before returning, so downstream code can assume they are defined.
 *
 * Also resolves the configuration file path:
 * - Uses ZEROGPU_CONFIG_PATH if provided
 * - Falls back to dist/../config/catalog.json (next to the compiled bundle)
 *
 * Why: This fail-fast approach catches configuration errors at startup before
 * the server is spawned, making debugging easier for Claude Code users.
 *
 * @throws {Error} If any required environment variable is missing
 * @returns {ResolvedEnv} Validated credentials and resolved config path
 */
function readEnv(): ResolvedEnv {
  const missing: string[] = [];
  const baseUrl = process.env.ZEROGPU_ORCHESTRATION_URL?.trim();
  const apiKey = process.env.ZEROGPU_API_KEY?.trim();
  const projectId = process.env.ZEROGPU_PROJECT_ID?.trim();

  // Validate each credential and collect missing ones for a single comprehensive error message
  if (!baseUrl) missing.push("ZEROGPU_ORCHESTRATION_URL");
  if (!apiKey) missing.push("ZEROGPU_API_KEY");
  if (!projectId) missing.push("ZEROGPU_PROJECT_ID");

  // Fail fast if any credential is missing, listing all missing ones together
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  // Resolve configuration path relative to the compiled bundle location
  // This allows the server to find its catalog regardless of where it's invoked from
  const here = dirname(fileURLToPath(import.meta.url));
  const defaultPath = pathResolve(here, "..", "config", "catalog.json");
  const configPath = process.env.ZEROGPU_CONFIG_PATH?.trim() || defaultPath;

  return { baseUrl: baseUrl!, apiKey: apiKey!, projectId: projectId!, configPath };
}

/**
 * Main async entry point for the server.
 *
 * Orchestrates the startup sequence:
 * 1. Load and validate environment configuration
 * 2. Create a ZeroGpuClient with the credentials
 * 3. Load tool definitions from the configuration file
 * 4. Build the MCP server with all tool handlers registered
 * 5. Connect the server to stdin/stdout (stdio transport)
 *
 * Why separate main(): Allows graceful async/await usage and centralized error handling.
 * Why stdio transport: MCP clients (Claude Code) spawn this server as a child process
 * and communicate via line-delimited JSON-RPC over stdin/stdout. No network needed.
 *
 * @returns {Promise<void>}
 */
async function main(): Promise<void> {
  const env = readEnv();

  // Create a client configured with ZeroGPU credentials
  // This client handles auth headers, retry logic, and timeouts for all backend calls
  const client = new ZeroGpuClient({
    baseUrl: env.baseUrl,
    apiKey: env.apiKey,
    projectId: env.projectId,
  });

  // Load the tool configuration (tool names, descriptions, handler mappings)
  const configProvider = await loadConfigFromFile(env.configPath);

  // Build the MCP server with all tools from the config, wired to their handlers
  const server = await buildServer({ client, configProvider });

  // Connect the server to stdin/stdout for MCP communication
  await runStdio(server);
}

/**
 * Starts the server and handles fatal errors.
 *
 * Catches any synchronous or async errors from main() and logs them to stderr
 * in JSON format (so Claude Code can parse them), then exits with code 1.
 *
 * Why JSON logging: Structured error output can be parsed by the MCP client
 * and displayed in the extension UI with consistent formatting.
 */
main().catch((err) => {
  process.stderr.write(
    `${JSON.stringify({ kind: "zerogpu.fatal", message: (err as Error).message })}\n`,
  );
  process.exit(1);
});
