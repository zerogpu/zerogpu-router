/**
 * @fileoverview IAB (Interactive Advertising Bureau) topic classification tool.
 *
 * Classifies text into standard web content categories (technology, sports, finance, etc.).
 * Two variants: standard taxonomy or enriched (more granular) taxonomy.
 * Returns a JSON object with category scores for each detected topic.
 */

import { z } from "zod";
import { mcpError, mcpJson, runChat, safeJsonParse, type HandlerContext } from "./shared.js";

/** Input schema: text and optional enriched flag. */
export const classifyIabArgs = z
  .object({
    text: z.string().min(1, "text must not be empty"),
    enriched: z.boolean().optional(), // If true, use enriched taxonomy (more categories)
  })
  .strict();

export type ClassifyIabArgs = z.infer<typeof classifyIabArgs>;

/**
 * IAB classification handler.
 *
 * Process:
 * 1. Call runChat with the appropriate task (standard or enriched)
 * 2. Parse the response as JSON (model outputs JSON object with category scores)
 * 3. Return parsed classification or raw text if parsing fails
 * 4. Include model info and cost/savings for user transparency
 *
 * Why two tasks: Different models handle standard vs enriched IAB categories.
 * Routing is done here based on the enriched flag.
 *
 * @param ctx Handler context
 * @param args Text to classify and optional enriched flag
 * @returns Classification with scores, model info, and cost breakdown
 */
export async function classifyIabHandler(ctx: HandlerContext, args: ClassifyIabArgs) {
  try {
    const result = await runChat(ctx, {
      task: args.enriched ? "classify_iab_enriched" : "classify_iab",
      toolName: "zerogpu_classify_iab",
      messages: [{ role: "user", content: args.text }],
    });

    // Try to parse as JSON; fallback to raw text if parsing fails
    const parsed = safeJsonParse(result.content);
    return mcpJson({
      classification: parsed.ok ? parsed.parsed : result.content,
      model: result.model,
      usage: result.usage,
      savings: result.savings,
      raw: parsed.ok ? undefined : result.content, // Include raw if parsing failed (for debugging)
    });
  } catch (err) {
    return mcpError((err as Error).message, { tool: "zerogpu_classify_iab" });
  }
}
