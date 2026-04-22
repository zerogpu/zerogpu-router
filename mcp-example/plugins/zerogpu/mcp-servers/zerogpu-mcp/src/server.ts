import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ZeroGpuClient } from "./zerogpuClient.js";
import { healthArgs, healthHandler } from "./tools/health.js";
import { classifyIabArgs, classifyIabHandler } from "./tools/classifyIab.js";
import { summarizeArgs, summarizeHandler } from "./tools/summarize.js";
import { classifyZeroShotArgs, classifyZeroShotHandler } from "./tools/classifyZeroShot.js";
import { extractEntitiesArgs, extractEntitiesHandler } from "./tools/extractEntities.js";
import { extractJsonArgs, extractJsonHandler } from "./tools/extractJson.js";
import { classifyStructuredArgs, classifyStructuredHandler } from "./tools/classifyStructured.js";
import { generateFollowupsArgs, generateFollowupsHandler } from "./tools/generateFollowups.js";
import { chatArgs, chatHandler } from "./tools/chat.js";

export interface ServerDeps {
  client: ZeroGpuClient;
}

export function buildServer(deps: ServerDeps): McpServer {
  const { client } = deps;

  const server = new McpServer({
    name: "zerogpu-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "zerogpu_health",
    {
      title: "ZeroGPU health check",
      description: "Verifies the ZeroGPU Orchestration API is reachable and returns component status.",
      inputSchema: healthArgs.shape,
    },
    (args) => healthHandler(client, args as Record<string, never>),
  );

  server.registerTool(
    "zerogpu_classify_iab",
    {
      title: "IAB content classification",
      description:
        "Classify text into IAB categories using the ZeroGPU edge classifier. Set enriched=true for the richer taxonomy.",
      inputSchema: classifyIabArgs.shape,
    },
    (args) => classifyIabHandler(client, args as never),
  );

  server.registerTool(
    "zerogpu_summarize",
    {
      title: "Summarize text",
      description: "Summarize a passage with Google T5-small. Use for TL;DRs, meeting notes, short abstracts.",
      inputSchema: summarizeArgs.shape,
    },
    (args) => summarizeHandler(client, args as never),
  );

  server.registerTool(
    "zerogpu_classify_zero_shot",
    {
      title: "Zero-shot label classification",
      description:
        "Score a text against a flat list of candidate labels using DeBERTa-v3-small NLI. Returns per-label scores.",
      inputSchema: classifyZeroShotArgs.shape,
    },
    (args) => classifyZeroShotHandler(client, args as never),
  );

  server.registerTool(
    "zerogpu_extract_entities",
    {
      title: "Extract named entities",
      description:
        "Extract entities (people, places, dates, custom types) from text with GLiNER2. Provide a flat list of entity labels.",
      inputSchema: extractEntitiesArgs.shape,
    },
    (args) => extractEntitiesHandler(client, args as never),
  );

  server.registerTool(
    "zerogpu_extract_json",
    {
      title: "Extract structured JSON",
      description:
        "Pull structured fields out of text using GLiNER2 JSON mode. Schema entries use the \"field::type::desc\" convention.",
      inputSchema: extractJsonArgs.shape,
    },
    (args) => extractJsonHandler(client, args as never),
  );

  server.registerTool(
    "zerogpu_classify_structured",
    {
      title: "Schema-driven classification",
      description:
        "Classify text into a structured schema of label groups with GLiNER2. Use when labels have categories (not a flat list).",
      inputSchema: classifyStructuredArgs.shape,
    },
    (args) => classifyStructuredHandler(client, args as never),
  );

  server.registerTool(
    "zerogpu_generate_followups",
    {
      title: "Generate follow-up questions",
      description: "Produce follow-up questions about a passage using the ZeroGPU edge follow-up model.",
      inputSchema: generateFollowupsArgs.shape,
    },
    (args) => generateFollowupsHandler(client, args as never),
  );

  server.registerTool(
    "zerogpu_chat",
    {
      title: "Small-model chat",
      description:
        "Chat with LFM2.5-1.2B. Set thinking=true to route to the Thinking variant; reasoning trace is returned separately.",
      inputSchema: chatArgs.shape,
    },
    (args) => chatHandler(client, args as never),
  );

  return server;
}
