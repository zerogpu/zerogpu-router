import { z } from "zod";
import type { ZeroGpuClient } from "../zerogpuClient.js";
import { mcpError, mcpJson, runChat, safeJsonParse } from "./shared.js";

export const extractEntitiesArgs = z
  .object({
    text: z.string().min(1, "text must not be empty"),
    labels: z.array(z.string().min(1)).min(1, "at least one label required"),
    threshold: z.number().min(0).max(1).optional(),
  })
  .strict();

export type ExtractEntitiesArgs = z.infer<typeof extractEntitiesArgs>;

export async function extractEntitiesHandler(client: ZeroGpuClient, args: ExtractEntitiesArgs) {
  try {
    const result = await runChat(client, {
      task: "extract_entities",
      toolName: "zerogpu_extract_entities",
      messages: [{ role: "user", content: args.text }],
      extra: {
        usecase: "ner",
        labels: args.labels,
        ...(args.threshold !== undefined ? { threshold: args.threshold } : {}),
      },
    });

    const parsed = safeJsonParse<Record<string, string[]>>(result.content);
    return mcpJson({
      entities: parsed.ok && parsed.parsed ? parsed.parsed : {},
      model: result.model,
      usage: result.usage,
      savings: result.savings,
      raw: parsed.ok ? undefined : result.content,
    });
  } catch (err) {
    return mcpError((err as Error).message, { tool: "zerogpu_extract_entities" });
  }
}
