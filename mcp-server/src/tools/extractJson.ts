/**
 * @fileoverview Structured JSON extraction tool.
 *
 * Extracts data from text into a user-specified JSON schema.
 * For example: extract "name", "email", "phone" from a resume.
 * Returns a JSON object matching the provided schema.
 */

import { z } from "zod";
import { mcpError, mcpJson, runChat, safeJsonParse, type HandlerContext } from "./shared.js";

/** Input schema: text and JSON schema to extract into. */
export const extractJsonArgs = z
  .object({
    text: z.string().min(1, "text must not be empty"),
    // Schema is Record<field_name, [entity_types]>
    // Example: { "name": ["person"], "location": ["place", "city"] }
    schema: z
      .record(z.array(z.string().min(1)))
      .refine((s) => Object.keys(s).length > 0, "schema must not be empty"),
  })
  .strict();

export type ExtractJsonArgs = z.infer<typeof extractJsonArgs>;

/**
 * JSON extraction handler.
 *
 * Process:
 * 1. Call runChat with usecase: "json" (tells backend to use GLiNER in JSON extraction mode)
 * 2. Pass the schema to the backend
 * 3. Parse the response as JSON matching the schema
 * 4. Return the extracted data (or empty dict if parsing fails)
 *
 * Schema format:
 * - Keys are field names (what to extract)
 * - Values are lists of entity types (what kinds of values to look for)
 * Example: { "sender": ["person"], "amount": ["money"] }
 *
 * @param ctx Handler context
 * @param args Text and extraction schema
 * @returns Extracted data matching the schema, plus model info and cost
 */
export async function extractJsonHandler(ctx: HandlerContext, args: ExtractJsonArgs) {
  try {
    const result = await runChat(ctx, {
      task: "extract_json",
      toolName: "zerogpu_extract_json",
      messages: [{ role: "user", content: args.text }],
      extra: {
        usecase: "json",   // Backend: use GLiNER in JSON extraction mode
        schema: args.schema, // Field and entity type mapping
      },
    });

    // Parse the response (expect { "field1": [...], "field2": [...], ... })
    const parsed = safeJsonParse<Record<string, unknown[]>>(result.content);
    return mcpJson({
      data: parsed.ok && parsed.parsed ? parsed.parsed : {}, // Empty dict if parsing fails
      model: result.model,
      usage: result.usage,
      savings: result.savings,
      raw: parsed.ok ? undefined : result.content, // Include raw if parsing failed
    });
  } catch (err) {
    return mcpError((err as Error).message, { tool: "zerogpu_extract_json" });
  }
}
