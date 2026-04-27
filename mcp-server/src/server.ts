import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";
import type { ConfigProvider, ToolHandlerId, ToolSpec, ZeroGpuConfig } from "./config.js";
import type { ZeroGpuClient } from "./zerogpuClient.js";
import type { HandlerContext } from "./tools/shared.js";

import { healthArgs, healthHandler } from "./tools/health.js";
import { classifyIabArgs, classifyIabHandler } from "./tools/classifyIab.js";
import { summarizeArgs, summarizeHandler } from "./tools/summarize.js";
import { classifyZeroShotArgs, classifyZeroShotHandler } from "./tools/classifyZeroShot.js";
import { extractEntitiesArgs, extractEntitiesHandler } from "./tools/extractEntities.js";
import { extractJsonArgs, extractJsonHandler } from "./tools/extractJson.js";
import { classifyStructuredArgs, classifyStructuredHandler } from "./tools/classifyStructured.js";
import { generateFollowupsArgs, generateFollowupsHandler } from "./tools/generateFollowups.js";
import { chatArgs, chatHandler } from "./tools/chat.js";

export const SERVER_INFO = {
  name: "zerogpu-mcp",
  version: "0.1.0",
} as const;

interface HandlerEntry<S extends z.ZodObject<z.ZodRawShape>> {
  schema: S;
  handler: (ctx: HandlerContext, args: z.infer<S>) => Promise<unknown>;
}

// Each handler id declared in KV config maps to a zod schema and runtime handler.
// Tool metadata (name, title, description) lives in KV — only the wiring lives here.
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
  generateFollowups: {
    schema: generateFollowupsArgs as unknown as z.ZodObject<z.ZodRawShape>,
    handler: (ctx, args) => generateFollowupsHandler(ctx, args as never),
  },
  chat: {
    schema: chatArgs as unknown as z.ZodObject<z.ZodRawShape>,
    handler: (ctx, args) => chatHandler(ctx, args as never),
  },
};

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

export interface ServerDeps {
  client: ZeroGpuClient;
  configProvider: ConfigProvider;
}

export async function buildServer(deps: ServerDeps): Promise<McpServer> {
  const config: ZeroGpuConfig = await deps.configProvider.getConfig();
  const server = new McpServer(SERVER_INFO);
  registerTools(server, { client: deps.client, configProvider: deps.configProvider }, config.tools);
  return server;
}
