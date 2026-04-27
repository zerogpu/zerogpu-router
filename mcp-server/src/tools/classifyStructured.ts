import { z } from "zod";
import { mcpError, mcpJson, runChat, safeJsonParse, type HandlerContext } from "./shared.js";

export const classifyStructuredArgs = z
  .object({
    text: z.string().min(1, "text must not be empty"),
    schema: z
      .record(z.array(z.string().min(1)))
      .refine((s) => Object.keys(s).length > 0, "schema must not be empty"),
  })
  .strict();

export type ClassifyStructuredArgs = z.infer<typeof classifyStructuredArgs>;

export async function classifyStructuredHandler(
  ctx: HandlerContext,
  args: ClassifyStructuredArgs,
) {
  try {
    const result = await runChat(ctx, {
      task: "classify_structured",
      toolName: "zerogpu_classify_structured",
      messages: [{ role: "user", content: args.text }],
      extra: {
        usecase: "classification",
        schema: args.schema,
      },
    });

    const parsed = safeJsonParse<Record<string, string | string[]>>(result.content);
    return mcpJson({
      classification: parsed.ok && parsed.parsed ? parsed.parsed : {},
      model: result.model,
      usage: result.usage,
      savings: result.savings,
      raw: parsed.ok ? undefined : result.content,
    });
  } catch (err) {
    return mcpError((err as Error).message, { tool: "zerogpu_classify_structured" });
  }
}
