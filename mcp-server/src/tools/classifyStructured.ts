/**
 * @fileoverview Multi-axis structured classification tool.
 *
 * Classifies text along multiple independent axes with predefined categories.
 * For example: classify a product review by { sentiment: ["positive", "negative", "neutral"],
 * category: ["price", "quality", "shipping"] }
 * Returns a dict mapping axis name to selected category.
 */

import { z } from "zod";
import { mcpError, mcpJson, runChat, safeJsonParse, type HandlerContext } from "./shared.js";

/** Input schema: text and multi-axis classification schema. */
export const classifyStructuredArgs = z
  .object({
    text: z.string().min(1, "text must not be empty"),
    // Schema is Record<axis_name, [category_options]>
    // Example: { "sentiment": ["positive", "negative"], "urgency": ["high", "low"] }
    schema: z
      .record(z.array(z.string().min(1)))
      .refine((s) => Object.keys(s).length > 0, "schema must not be empty"),
  })
  .strict();

export type ClassifyStructuredArgs = z.infer<typeof classifyStructuredArgs>;

/**
 * Multi-axis classification handler.
 *
 * Process:
 * 1. Call runChat with usecase: "classification" (tells backend to do classification)
 * 2. Pass the schema with multiple axes
 * 3. Parse the response as JSON { "axis1": "category", ... }
 * 4. Return the classifications (or empty dict if parsing fails)
 *
 * Schema format:
 * - Keys are axis names (what dimensions to classify on)
 * - Values are lists of category options (choices for each dimension)
 * Example: { "sentiment": ["positive", "negative"], "topic": ["tech", "sports"] }
 *
 * Why structured: Unlike zero-shot classification (which is for labels that may
 * overlap), structured classification expects a clear schema with independent axes.
 * The backend handles this with a different model path.
 *
 * @param ctx Handler context
 * @param args Text and multi-axis classification schema
 * @returns Dict of axis → selected category, plus model info and cost
 */
export async function classifyStructuredHandler(
  ctx: HandlerContext,
  args: ClassifyStructuredArgs,
) {
  try {
    const result = await runChat(ctx, {
      task: "classify_structured",
      toolName: "zerogpu_classify_structured",
      messages: [{ role: "user", content: args.text }],
      metadata: {
        usecase: "classification", // Backend: use GLiNER in classification mode
        schema: args.schema,        // Axis and category mapping
      },
    });

    // Parse the response (expect { "axis1": "category", ... })
    const parsed = safeJsonParse<Record<string, string | string[]>>(result.content);
    return mcpJson({
      classification: parsed.ok && parsed.parsed ? parsed.parsed : {}, // Empty dict if parsing fails
      model: result.model,
      usage: result.usage,
      savings: result.savings,
      raw: parsed.ok ? undefined : result.content, // Include raw if parsing failed
    });
  } catch (err) {
    return mcpError((err as Error).message, { tool: "zerogpu_classify_structured" });
  }
}
