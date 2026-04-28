/**
 * @fileoverview Structured JSON extraction tool.
 *
 * Extracts data from text into a user-specified JSON schema using GLiNER2.
 * For example: extract a "contact" group with name/title/company/phone/email
 * fields from an email signature. Returns a JSON object grouped by the schema.
 */

import { z } from "zod";
import { mcpError, mcpJson, runChat, safeJsonParse, type HandlerContext } from "./shared.js";

/** Input schema: text and grouped JSON schema to extract into. */
export const extractJsonArgs = z
  .object({
    text: z.string().min(1, "text must not be empty"),
    // Schema is Record<group_name, ["field::type::desc", ...]>
    // Example: { "contact": ["name::str::Full name", "email::str::Email address"] }
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
 * 2. Pass the grouped schema to the backend
 * 3. Parse the response as JSON matching the schema
 * 4. Return the extracted data (or empty dict if parsing fails)
 *
 * Schema format (GLiNER2 grouped extraction):
 * - Keys are group names (e.g., "contact", "invoice")
 * - Values are arrays of "field::type::desc" strings
 *   - field: output key inside the group (e.g., "name", "email")
 *   - type: scalar type hint (e.g., "str", "int", "date", "money")
 *   - desc: short natural-language description used to guide the model
 * Example:
 *   { "contact": ["name::str::Full name", "email::str::Email address"] }
 *
 * Response shape (from backend) mirrors the schema, with each group containing
 * the extracted field map (or array of maps when multiple instances are found),
 * so the value type is intentionally `unknown`.
 *
 * @param ctx Handler context
 * @param args Text and extraction schema
 * @returns Extracted data grouped by schema, plus model info and cost
 */
export async function extractJsonHandler(ctx: HandlerContext, args: ExtractJsonArgs) {
  try {
    const result = await runChat(ctx, {
      task: "extract_json",
      toolName: "zerogpu_extract_json",
      messages: [{ role: "user", content: args.text }],
      extra: {
        usecase: "json",   // Backend: use GLiNER in JSON extraction mode
        schema: args.schema, // Grouped field schema
      },
    });

    // Parse the response (expect { "group1": {...} | [...], ... })
    const parsed = safeJsonParse<Record<string, unknown>>(result.content);
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
