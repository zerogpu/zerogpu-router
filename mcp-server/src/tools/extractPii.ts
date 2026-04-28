/**
 * @fileoverview PII extraction tool.
 *
 * Extracts personally identifiable information from text into a structured map
 * using the gliner-multi-pii-v1 model. Categories (e.g., "identity", "contact",
 * "financial") select which PII families to surface; threshold filters by confidence.
 */

import { z } from "zod";
import { mcpError, mcpJson, runChat, safeJsonParse, type HandlerContext } from "./shared.js";

/** Input schema: text, optional confidence threshold, optional category filter. */
export const extractPiiArgs = z
  .object({
    text: z.string().min(1, "text must not be empty"),
    threshold: z.number().min(0).max(1).optional(),
    // Optional: restrict extraction to a subset of supported PII categories.
    // Examples: "identity", "contact", "financial", "credentials", "location".
    categories: z.array(z.string().min(1)).min(1).optional(),
  })
  .strict();

export type ExtractPiiArgs = z.infer<typeof extractPiiArgs>;

/**
 * PII extraction handler.
 *
 * Process:
 * 1. Call runChat with usecase: "extract-pii" (routes to gliner-multi-pii-v1)
 * 2. Pass optional threshold and categories under `metadata`
 * 3. Parse the response as JSON ({ category: [values] } or similar)
 * 4. Return the extracted PII map (or empty object if parsing fails)
 *
 * @param ctx Handler context
 * @param args Text, optional threshold, and optional category filter
 * @returns Extracted PII grouped by category, plus model info and cost
 */
export async function extractPiiHandler(ctx: HandlerContext, args: ExtractPiiArgs) {
  try {
    const result = await runChat(ctx, {
      task: "extract_pii",
      toolName: "zerogpu_extract_pii",
      messages: [{ role: "user", content: args.text }],
      metadata: {
        usecase: "extract-pii",
        ...(args.threshold !== undefined ? { threshold: args.threshold } : {}),
        ...(args.categories !== undefined ? { categories: args.categories } : {}),
      },
    });

    const parsed = safeJsonParse<Record<string, unknown>>(result.content);
    return mcpJson({
      pii: parsed.ok && parsed.parsed ? parsed.parsed : {},
      model: result.model,
      usage: result.usage,
      savings: result.savings,
      raw: parsed.ok ? undefined : result.content,
    });
  } catch (err) {
    return mcpError((err as Error).message, { tool: "zerogpu_extract_pii" });
  }
}
