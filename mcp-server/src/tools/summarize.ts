/**
 * @fileoverview Text summarization tool.
 *
 * Summarizes a passage into a shorter form, preserving key information.
 * Uses the T5-small model, which expects the "summarize: " prefix for best results.
 * Supports optional max_tokens to control summary length.
 */

import { z } from "zod";
import { mcpError, mcpJson, runChat, type HandlerContext } from "./shared.js";

/** Input schema: text to summarize and optional max output tokens. */
export const summarizeArgs = z
  .object({
    text: z.string().min(1, "text must not be empty"),
    max_tokens: z.number().int().positive().max(2048).optional(),
  })
  .strict();

export type SummarizeArgs = z.infer<typeof summarizeArgs>;

/**
 * Text summarization handler.
 *
 * Process:
 * 1. Prepend "summarize: " to the text (T5-small expects this prefix)
 * 2. Call runChat with the prefixed text
 * 3. Return the summary (the model's output)
 * 4. Include model info and cost/savings for transparency
 *
 * Why the prefix: T5-small is a task-aware model that uses text prefixes to
 * indicate the task. For summarization, it expects "summarize: " at the start.
 * This is a model-specific convention that improves quality.
 *
 * Why optional max_tokens: Some users want precise control over summary length;
 * others are happy with the model's default. Both modes are supported.
 *
 * @param ctx Handler context
 * @param args Text to summarize and optional max output length
 * @returns Summary text, model name, token usage, and cost savings
 */
export async function summarizeHandler(ctx: HandlerContext, args: SummarizeArgs) {
  try {
    const result = await runChat(ctx, {
      task: "summarize",
      toolName: "zerogpu_summarize",
      // T5-small expects "summarize: " prefix for best results
      messages: [{ role: "user", content: `summarize: ${args.text}` }],
      // Pass max_tokens to the backend if provided
      extra: args.max_tokens ? { max_tokens: args.max_tokens } : undefined,
    });

    return mcpJson({
      summary: result.content,      // The generated summary
      model: result.model,
      usage: result.usage,
      savings: result.savings,
    });
  } catch (err) {
    return mcpError((err as Error).message, { tool: "zerogpu_summarize" });
  }
}
