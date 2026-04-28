/**
 * @fileoverview MCP server setup and tool registration.
 *
 * This is the core of the MCP server: it builds the server, registers tools,
 * and wires them to their handlers. Used by both:
 * - Node entry (index.ts): creates a stdio MCP server
 * - Cloudflare Worker entry (worker.ts): creates a Durable Object MCP server
 *
 * The separation of concerns here is important:
 * - Configuration lives in KV or a file (tool names, descriptions, handler IDs)
 * - Handlers are defined in src/tools/*.ts
 * - This file maps handler IDs to implementations
 * - The transport layer (stdio or Worker) talks to the MCP server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";
import type { ConfigProvider, ToolHandlerId, ToolSpec, ZeroGpuConfig } from "./config.js";
import type { ZeroGpuClient } from "./zerogpuClient.js";
import type { HandlerContext } from "./tools/shared.js";

// Import all tool handlers and their argument schemas
import { healthArgs, healthHandler } from "./tools/health.js";
import { classifyIabArgs, classifyIabHandler } from "./tools/classifyIab.js";
import { summarizeArgs, summarizeHandler } from "./tools/summarize.js";
import { classifyZeroShotArgs, classifyZeroShotHandler } from "./tools/classifyZeroShot.js";
import { extractEntitiesArgs, extractEntitiesHandler } from "./tools/extractEntities.js";
import { extractJsonArgs, extractJsonHandler } from "./tools/extractJson.js";
import { classifyStructuredArgs, classifyStructuredHandler } from "./tools/classifyStructured.js";
import { redactPiiArgs, redactPiiHandler } from "./tools/redactPii.js";
import { extractPiiArgs, extractPiiHandler } from "./tools/extractPii.js";
import { generateFollowupsArgs, generateFollowupsHandler } from "./tools/generateFollowups.js";
import { chatArgs, chatHandler } from "./tools/chat.js";

/**
 * Metadata about this MCP server.
 * Sent to the client (Claude Code) during the initialize handshake.
 * Name and version should match the package.json and CLI tool name.
 */
export const SERVER_INFO = {
  name: "zerogpu-mcp",
  version: "0.1.0",
} as const;

/**
 * Type-safe entry for a handler: a Zod schema for input validation and the handler function itself.
 * Used internally to store both the argument schema and the async handler.
 */
interface HandlerEntry<S extends z.ZodObject<z.ZodRawShape>> {
  schema: S;  // Zod schema for validating and parsing tool arguments
  handler: (ctx: HandlerContext, args: z.infer<S>) => Promise<unknown>; // Async handler function
}

/**
 * Map of handler IDs to their schemas and implementations.
 *
 * This is the core wiring: when a config ToolSpec references a handler ID (e.g., "summarize"),
 * we look it up here to get the schema (for argument validation) and handler (the actual function).
 *
 * Architecture note: Tool metadata (name, title, description) lives in config (KV or file).
 * Only the technical wiring (schema + handler) lives here. This allows:
 * - Changing tool names/descriptions without redeploying code
 * - New tools to be registered just by adding a config entry (if handler exists)
 * - Disabling tools by removing them from config without removing code
 *
 * Each handler entry has casts (`as unknown as`) because Zod's type inference is strict,
 * and we're storing heterogeneous types in one Record. The actual type is correct at
 * the call site (where we pass concrete types) and runtime validation ensures safety.
 */
const HANDLERS: Record<ToolHandlerId, HandlerEntry<z.ZodObject<z.ZodRawShape>>> = {
  health: {
    schema: healthArgs as z.ZodObject<z.ZodRawShape>,
    handler: (ctx, args) => healthHandler(ctx, args as Record<string, never>),
  },
  classifyIab: {
    schema: classifyIabArgs as unknown as z.ZodObject<z.ZodRawShape>,
    handler: (ctx, args) => classifyIabHandler(ctx, args as never),
  },
  summarize: {
    schema: summarizeArgs as unknown as z.ZodObject<z.ZodRawShape>,
    handler: (ctx, args) => summarizeHandler(ctx, args as never),
  },
  classifyZeroShot: {
    schema: classifyZeroShotArgs as unknown as z.ZodObject<z.ZodRawShape>,
    handler: (ctx, args) => classifyZeroShotHandler(ctx, args as never),
  },
  extractEntities: {
    schema: extractEntitiesArgs as unknown as z.ZodObject<z.ZodRawShape>,
    handler: (ctx, args) => extractEntitiesHandler(ctx, args as never),
  },
  extractJson: {
    schema: extractJsonArgs as unknown as z.ZodObject<z.ZodRawShape>,
    handler: (ctx, args) => extractJsonHandler(ctx, args as never),
  },
  classifyStructured: {
    schema: classifyStructuredArgs as unknown as z.ZodObject<z.ZodRawShape>,
    handler: (ctx, args) => classifyStructuredHandler(ctx, args as never),
  },
  redactPii: {
    schema: redactPiiArgs as unknown as z.ZodObject<z.ZodRawShape>,
    handler: (ctx, args) => redactPiiHandler(ctx, args as never),
  },
  extractPii: {
    schema: extractPiiArgs as unknown as z.ZodObject<z.ZodRawShape>,
    handler: (ctx, args) => extractPiiHandler(ctx, args as never),
  },
  generateFollowups: {
    schema: generateFollowupsArgs as unknown as z.ZodObject<z.ZodRawShape>,
    handler: (ctx, args) => generateFollowupsHandler(ctx, args as never),
  },
  chat: {
    schema: chatArgs as unknown as z.ZodObject<z.ZodRawShape>,
    handler: (ctx, args) => chatHandler(ctx, args as never),
  },
};

/**
 * Registers all tools from a configuration into an MCP server.
 *
 * Process for each ToolSpec in the config:
 * 1. Look up the handler entry by handler ID
 * 2. Extract the schema and handler function
 * 3. Call server.registerTool() with:
 *    - Tool name (globally unique ID)
 *    - Title and description (for UI)
 *    - Input schema (Zod shape, used for argument validation and API introspection)
 *    - Handler function (called when the tool is invoked)
 *
 * Why runtime lookup: Configuration is dynamic (from KV or file), so tool registration
 * is also dynamic. At startup, we load the config and register exactly the tools listed,
 * ignoring unused handlers.
 *
 * Error handling: If a config references a handler ID that doesn't exist in HANDLERS,
 * we throw immediately with a clear error. This prevents silent tool registration failures.
 *
 * @param server The MCP server instance to register tools into
 * @param ctx Handler context (client, configProvider) passed to all handlers
 * @param tools Array of tool specifications from the config (name, title, handler ID, etc.)
 * @throws {Error} If any tool's handler ID doesn't exist in HANDLERS
 */
export function registerTools(
  server: McpServer,
  ctx: HandlerContext,
  tools: ToolSpec[],
): void {
  for (const spec of tools) {
    const entry = HANDLERS[spec.handler];
    if (!entry) {
      throw new Error(`Unknown handler '${spec.handler}' for tool '${spec.name}'`);
    }
    server.registerTool(
      spec.name,
      {
        title: spec.title,
        description: spec.description,
        inputSchema: entry.schema.shape,
      },
      (args) => entry.handler(ctx, args) as never,
    );
  }
}

/**
 * Dependencies needed to build an MCP server.
 * These are the two injectable components: the backend client and config source.
 */
export interface ServerDeps {
  client: ZeroGpuClient;           // HTTP client for ZeroGPU API
  configProvider: ConfigProvider;  // Source of tool configuration (file or KV)
}

/**
 * Builds a fully-initialized MCP server ready to handle tool calls.
 *
 * Process:
 * 1. Load the tool configuration from the config provider
 * 2. Create a new MCP server with standard server info
 * 3. Register all tools from the config
 * 4. Return the server (ready to connect to a transport)
 *
 * Why separate buildServer from the transport: Allows both stdio (Node) and HTTP
 * (Cloudflare Worker) transports to use the same server-building logic. The server
 * itself is transport-agnostic; only the connection method changes.
 *
 * @param deps Injected dependencies (client and config provider)
 * @returns Initialized McpServer ready for tool calls
 */
export async function buildServer(deps: ServerDeps): Promise<McpServer> {
  // Load tool configuration (names, descriptions, handler mappings)
  const config: ZeroGpuConfig = await deps.configProvider.getConfig();

  // Create MCP server instance
  const server = new McpServer(SERVER_INFO);

  // Register all tools from the configuration
  registerTools(server, { client: deps.client, configProvider: deps.configProvider }, config.tools);

  return server;
}
