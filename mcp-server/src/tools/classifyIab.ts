import { z } from "zod";
import { mcpError, mcpJson, runChat, safeJsonParse, type HandlerContext } from "./shared.js";

export const classifyIabArgs = z
  .object({
    text: z.string().min(1, "text must not be empty"),
    enriched: z.boolean().optional(),
  })
  .strict();

export type ClassifyIabArgs = z.infer<typeof classifyIabArgs>;

export async function classifyIabHandler(ctx: HandlerContext, args: ClassifyIabArgs) {
  try {
    const result = await runChat(ctx, {
      task: args.enriched ? "classify_iab_enriched" : "classify_iab",
      toolName: "zerogpu_classify_iab",
      messages: [{ role: "user", content: args.text }],
    });

    const parsed = safeJsonParse(result.content);
    return mcpJson({
      classification: parsed.ok ? parsed.parsed : result.content,
      model: result.model,
      usage: result.usage,
      savings: result.savings,
      raw: parsed.ok ? undefined : result.content,
    });
  } catch (err) {
    return mcpError((err as Error).message, { tool: "zerogpu_classify_iab" });
  }
}
