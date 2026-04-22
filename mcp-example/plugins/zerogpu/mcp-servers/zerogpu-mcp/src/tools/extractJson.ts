import { z } from "zod";
import type { ZeroGpuClient } from "../zerogpuClient.js";
import { mcpError, mcpJson, runChat, safeJsonParse } from "./shared.js";

export const extractJsonArgs = z
  .object({
    text: z.string().min(1, "text must not be empty"),
    schema: z
      .record(z.array(z.string().min(1)))
      .refine((s) => Object.keys(s).length > 0, "schema must not be empty"),
  })
  .strict();

export type ExtractJsonArgs = z.infer<typeof extractJsonArgs>;

export async function extractJsonHandler(client: ZeroGpuClient, args: ExtractJsonArgs) {
  try {
    const result = await runChat(client, {
      task: "extract_json",
      toolName: "zerogpu_extract_json",
      messages: [{ role: "user", content: args.text }],
      extra: {
        usecase: "json",
        schema: args.schema,
      },
    });

    const parsed = safeJsonParse<Record<string, unknown[]>>(result.content);
    return mcpJson({
      data: parsed.ok && parsed.parsed ? parsed.parsed : {},
      model: result.model,
      usage: result.usage,
      savings: result.savings,
      raw: parsed.ok ? undefined : result.content,
    });
  } catch (err) {
    return mcpError((err as Error).message, { tool: "zerogpu_extract_json" });
  }
}
