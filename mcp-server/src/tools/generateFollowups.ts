/**
 * @fileoverview Follow-up question generation tool.
 *
 * Generates a list of follow-up questions about a given passage or topic.
 * Useful for interviews, research, documentation, or expanding on a discussion.
 * Returns an array of question strings.
 */

import { z } from "zod";
import { mcpError, mcpJson, runChat, safeJsonParse, type HandlerContext } from "./shared.js";

/** Input schema: just the text to generate questions about. */
export const generateFollowupsArgs = z
  .object({
    text: z.string().min(1, "text must not be empty"),
  })
  .strict();

export type GenerateFollowupsArgs = z.infer<typeof generateFollowupsArgs>;

/**
 * Helper to extract a list of questions from various response formats.
 *
 * The backend may return questions in multiple formats:
 * - As a JSON array: ["Question 1?", "Question 2?", ...]
 * - As a JSON object with "questions" key: { "questions": [...] }
 * - As plain text with one question per line (fallback)
 *
 * This function tries all formats in order and falls back to parsing
 * the raw text if JSON parsing fails. Filters out non-questions
 * (lines that don't end with "?") and empty lines.
 *
 * Why multiple formats: Different model versions or configs may return
 * different formats. Being tolerant of multiple formats improves robustness.
 *
 * @param value Parsed JSON (if it was valid JSON)
 * @param fallback Raw response text (fallback if not valid JSON)
 * @returns Array of question strings (empty array if none found)
 */
function toQuestionList(value: unknown, fallback: string): string[] {
  // Try: array format ["Q1", "Q2", ...]
  if (Array.isArray(value)) {
    return value.filter((q): q is string => typeof q === "string" && q.trim().length > 0);
  }

  // Try: object with "questions" key { "questions": [...] }
  if (value && typeof value === "object" && "questions" in (value as Record<string, unknown>)) {
    const inner = (value as Record<string, unknown>).questions;
    if (Array.isArray(inner)) {
      return inner.filter((q): q is string => typeof q === "string" && q.trim().length > 0);
    }
  }

  // Fallback: parse as plain text (one question per line)
  // Remove common list prefixes (-, *, 1., etc.) and filter for lines ending with "?"
  return fallback
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*\d.)\s]+/, "").trim())
    .filter((line) => line.length > 0 && line.endsWith("?"));
}

/**
 * Follow-up question generation handler.
 *
 * Process:
 * 1. Call runChat to generate questions
 * 2. Try to parse the response as JSON; if it fails, use raw text
 * 3. Extract questions using toQuestionList (handles multiple formats)
 * 4. Return the questions array
 * 5. Include raw response only if no questions were extracted (for debugging)
 *
 * Why flexible parsing: The backend may return different formats depending
 * on model version or configuration. Being flexible makes the tool robust.
 *
 * @param ctx Handler context
 * @param args Text to generate questions about
 * @returns Array of follow-up questions, plus model info and cost
 */
export async function generateFollowupsHandler(ctx: HandlerContext, args: GenerateFollowupsArgs) {
  try {
    const result = await runChat(ctx, {
      task: "generate_followups",
      toolName: "zerogpu_generate_followups",
      messages: [{ role: "user", content: args.text }],
    });

    // Try to parse as JSON; fall back to raw text
    const parsed = safeJsonParse(result.content);
    const questions = toQuestionList(parsed.ok ? parsed.parsed : null, result.content);

    return mcpJson({
      questions,
      model: result.model,
      usage: result.usage,
      savings: result.savings,
      // Include raw response only if no questions were extracted (debugging aid)
      raw: questions.length === 0 ? result.content : undefined,
    });
  } catch (err) {
    return mcpError((err as Error).message, { tool: "zerogpu_generate_followups" });
  }
}
