import { z } from "zod";
import type { ZeroGpuClient } from "../zerogpuClient.js";
import { mcpError, mcpJson, runChat } from "./shared.js";

export const summarizeArgs = z
  .object({
    text: z.string().min(1, "text must not be empty"),
    max_tokens: z.number().int().positive().max(2048).optional(),
  })
  .strict();

export type SummarizeArgs = z.infer<typeof summarizeArgs>;

export async function summarizeHandler(client: ZeroGpuClient, args: SummarizeArgs) {
  try {
    const result = await runChat(client, {
      task: "summarize",
      toolName: "zerogpu_summarize",
      messages: [{ role: "user", content: `summarize: ${args.text}` }],
      extra: args.max_tokens ? { max_tokens: args.max_tokens } : undefined,
    });

    return mcpJson({
      summary: result.content,
      model: result.model,
      usage: result.usage,
      savings: result.savings,
    });
  } catch (err) {
    return mcpError((err as Error).message, { tool: "zerogpu_summarize" });
  }
}
