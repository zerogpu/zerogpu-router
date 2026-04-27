import { z } from "zod";
import { mcpError, mcpJson, runChat, safeJsonParse, type HandlerContext } from "./shared.js";

export const classifyZeroShotArgs = z
  .object({
    text: z.string().min(1, "text must not be empty"),
    labels: z.array(z.string().min(1)).min(2, "at least two labels required"),
    threshold: z.number().min(0).max(1).optional(),
  })
  .strict();

export type ClassifyZeroShotArgs = z.infer<typeof classifyZeroShotArgs>;

export async function classifyZeroShotHandler(ctx: HandlerContext, args: ClassifyZeroShotArgs) {
  try {
    const systemPrompt = `[${args.labels.join(",")}]`;
    const result = await runChat(ctx, {
      task: "classify_zero_shot",
      toolName: "zerogpu_classify_zero_shot",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: args.text },
      ],
    });

    const parsed = safeJsonParse<Record<string, number>>(result.content);
    const scores = parsed.ok && parsed.parsed ? parsed.parsed : {};
    const threshold = args.threshold ?? 0.5;
    const labelsAbove = Object.entries(scores)
      .filter(([, score]) => typeof score === "number" && score >= threshold)
      .map(([label]) => label);

    return mcpJson({
      scores,
      labels_above_threshold: labelsAbove,
      threshold,
      model: result.model,
      usage: result.usage,
      savings: result.savings,
      raw: parsed.ok ? undefined : result.content,
    });
  } catch (err) {
    return mcpError((err as Error).message, { tool: "zerogpu_classify_zero_shot" });
  }
}
