import { z } from "zod";
import { mcpError, mcpJson, runChat, safeJsonParse, type HandlerContext } from "./shared.js";

export const generateFollowupsArgs = z
  .object({
    text: z.string().min(1, "text must not be empty"),
  })
  .strict();

export type GenerateFollowupsArgs = z.infer<typeof generateFollowupsArgs>;

function toQuestionList(value: unknown, fallback: string): string[] {
  if (Array.isArray(value)) {
    return value.filter((q): q is string => typeof q === "string" && q.trim().length > 0);
  }
  if (value && typeof value === "object" && "questions" in (value as Record<string, unknown>)) {
    const inner = (value as Record<string, unknown>).questions;
    if (Array.isArray(inner)) {
      return inner.filter((q): q is string => typeof q === "string" && q.trim().length > 0);
    }
  }
  return fallback
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*\d.)\s]+/, "").trim())
    .filter((line) => line.length > 0 && line.endsWith("?"));
}

export async function generateFollowupsHandler(ctx: HandlerContext, args: GenerateFollowupsArgs) {
  try {
    const result = await runChat(ctx, {
      task: "generate_followups",
      toolName: "zerogpu_generate_followups",
      messages: [{ role: "user", content: args.text }],
    });

    const parsed = safeJsonParse(result.content);
    const questions = toQuestionList(parsed.ok ? parsed.parsed : null, result.content);

    return mcpJson({
      questions,
      model: result.model,
      usage: result.usage,
      savings: result.savings,
      raw: questions.length === 0 ? result.content : undefined,
    });
  } catch (err) {
    return mcpError((err as Error).message, { tool: "zerogpu_generate_followups" });
  }
}
