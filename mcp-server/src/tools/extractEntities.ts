/**
 * @fileoverview Named Entity Recognition (NER) tool.
 *
 * Extracts entities of specified types from text.
 * For example: extract all "person", "location", "organization" names from a passage.
 * Returns a dict mapping entity type to list of found values.
 */

import { z } from "zod";
import { mcpError, mcpJson, runChat, safeJsonParse, type HandlerContext } from "./shared.js";

/** Input schema: text, entity type labels (1+), optional confidence threshold. */
export const extractEntitiesArgs = z
  .object({
    text: z.string().min(1, "text must not be empty"),
    labels: z.array(z.string().min(1)).min(1, "at least one label required"),
    threshold: z.number().min(0).max(1).optional(), // Confidence threshold
  })
  .strict();

export type ExtractEntitiesArgs = z.infer<typeof extractEntitiesArgs>;

/**
 * Named Entity Recognition handler.
 *
 * Process:
 * 1. Call runChat with usecase: "ner" (tells the backend to do NER, not chat)
 * 2. Pass labels and threshold to the backend
 * 3. Parse the response as JSON { "entity_type": ["value1", "value2"], ... }
 * 4. Return the entities dict (or empty dict if parsing fails)
 *
 * Why usecase field: The backend uses this to route to the GLiNER model
 * (a specialized NER model, not general chat). Different usecases
 * trigger different model paths.
 *
 * @param ctx Handler context
 * @param args Text, entity type labels, and optional threshold
 * @returns Dict of entity_type → values found, plus model info and cost
 */
export async function extractEntitiesHandler(ctx: HandlerContext, args: ExtractEntitiesArgs) {
  try {
    const result = await runChat(ctx, {
      task: "extract_entities",
      toolName: "zerogpu_extract_entities",
      messages: [{ role: "user", content: args.text }],
      extra: {
        usecase: "ner",             // Backend: use NER model
        labels: args.labels,        // Entity types to extract
        ...(args.threshold !== undefined ? { threshold: args.threshold } : {}), // Optional confidence filter
      },
    });

    // Parse the response (expect { "entity_type": ["value1", "value2"], ... })
    const parsed = safeJsonParse<Record<string, string[]>>(result.content);
    return mcpJson({
      entities: parsed.ok && parsed.parsed ? parsed.parsed : {}, // Empty dict if parsing fails
      model: result.model,
      usage: result.usage,
      savings: result.savings,
      raw: parsed.ok ? undefined : result.content, // Include raw if parsing failed
    });
  } catch (err) {
    return mcpError((err as Error).message, { tool: "zerogpu_extract_entities" });
  }
}
