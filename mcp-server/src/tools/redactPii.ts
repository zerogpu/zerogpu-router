/**
 * @fileoverview PII redaction tool.
 *
 * Replaces personally identifiable information (names, phones, emails, addresses, ...)
 * in text with masked placeholders using the gliner-multi-pii-v1 model.
 * The `mask` option controls how PII is replaced (e.g., "label" → [PHONE], [EMAIL]).
 */

import { z } from "zod";
import { mcpError, mcpJson, runChat, safeJsonParse, type HandlerContext } from "./shared.js";

/** Input schema: text to redact and optional mask mode. */
export const redactPiiArgs = z
  .object({
    text: z.string().min(1, "text must not be empty"),
    // How PII tokens are rendered in the output. Defaults to "label" on the backend
    // (e.g., "[PHONE]", "[EMAIL]"). Pass other values when supported by the model.
    mask: z.string().min(1).optional(),
  })
  .strict();

export type RedactPiiArgs = z.infer<typeof redactPiiArgs>;

/**
 * PII redaction handler.
 *
 * Process:
 * 1. Call runChat with usecase: "redact" (routes to gliner-multi-pii-v1)
 * 2. Pass the optional `mask` parameter inside `metadata`
 * 3. Try to parse the response as JSON (some backends return { redacted: "..." })
 * 4. Otherwise return the raw model content as the redacted text
 *
 * @param ctx Handler context
 * @param args Text and optional mask mode
 * @returns Redacted text plus model info and cost
 */
export async function redactPiiHandler(ctx: HandlerContext, args: RedactPiiArgs) {
  try {
    const result = await runChat(ctx, {
      task: "redact_pii",
      toolName: "zerogpu_redact_pii",
      messages: [{ role: "user", content: args.text }],
      metadata: {
        usecase: "redact",
        ...(args.mask !== undefined ? { mask: args.mask } : {}),
      },
    });

    // Some backends wrap the redacted text in a JSON envelope; fall back to raw text.
    const parsed = safeJsonParse<{ redacted?: string } | string>(result.content);
    const redacted =
      parsed.ok && parsed.parsed && typeof parsed.parsed === "object" && "redacted" in parsed.parsed
        ? String(parsed.parsed.redacted ?? "")
        : result.content;

    return mcpJson({
      redacted,
      model: result.model,
      usage: result.usage,
      savings: result.savings,
    });
  } catch (err) {
    return mcpError((err as Error).message, { tool: "zerogpu_redact_pii" });
  }
}
