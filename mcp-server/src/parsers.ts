/**
 * @fileoverview Text parsing utilities for handling model outputs.
 *
 * Three main responsibilities:
 * 1. stripCodeFence: Remove markdown JSON fences from responses
 * 2. safeJsonParse: Parse JSON robustly without throwing, returning a result object
 * 3. stripThinkTags: Extract hidden reasoning from thinking models
 *
 * These utilities make the MCP server tolerant of small variations in model output
 * formatting, improving reliability when multiple models or versions are in use.
 */

/**
 * Result of attempting to parse JSON from text.
 * Provides both the parsed object and the original raw text for debugging.
 */
export interface SafeJsonResult<T = unknown> {
  parsed: T | null;  // The parsed object, or null if parsing failed
  raw: string;       // Original input text (useful for logging failures)
  ok: boolean;       // True if parsing succeeded, false otherwise
}

/**
 * Regex pattern to match markdown code fences with optional 'json' language tag.
 * Matches: ```json ... ``` or ``` ... ```
 * Extracts the content between the fence markers (captured group 1).
 *
 * Why this pattern: Some models (especially when prompted with "output JSON")
 * wrap their response in markdown code fences, especially on web interfaces.
 * Stripping them makes the response suitable for JSON.parse().
 */
const JSON_FENCE = /^\s*```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i;

/**
 * Removes markdown code fence from text if present, otherwise returns the text as-is.
 *
 * Handles two cases:
 * - Input: "```json\n{...}\n```" → Output: "{...}"
 * - Input: "{...}" → Output: "{...}"
 *
 * Why: Many models wrap JSON in markdown code blocks. This preprocessing
 * step allows downstream code to assume it has raw JSON, not wrapped JSON.
 *
 * @param text Text that may be wrapped in a code fence
 * @returns The text with code fence removed (if present)
 */
export function stripCodeFence(text: string): string {
  const match = text.match(JSON_FENCE);
  return match ? match[1].trim() : text.trim();
}

/**
 * Safely parses JSON from text, returning a result object instead of throwing.
 *
 * Process:
 * 1. Normalize null/undefined input to empty string
 * 2. Strip code fences (if wrapped in ```...```)
 * 3. Attempt JSON.parse() on the cleaned text
 * 4. Return { parsed, raw, ok } regardless of success
 *
 * Why safe parsing: Tool handlers need to decide how to respond to parse failures
 * (fallback to string, report error to user, etc.). Throwing makes that harder.
 * Returning a result object lets the handler see the raw input and parse error details.
 *
 * @param text Text that should be valid JSON (possibly wrapped in code fences)
 * @returns Result object with parsed value or null, raw input, and ok flag
 */
export function safeJsonParse<T = unknown>(text: string): SafeJsonResult<T> {
  const raw = text ?? "";
  const candidate = stripCodeFence(raw);
  try {
    return { parsed: JSON.parse(candidate) as T, raw, ok: true };
  } catch {
    return { parsed: null, raw, ok: false };
  }
}

/**
 * Result of splitting model output into content and reasoning.
 * Used for models that include hidden reasoning in <think>...</think> tags.
 */
export interface ThinkSplit {
  content: string;     // The main response, with <think> tags removed
  reasoning?: string;  // Extracted <think>...</think> content (optional if not present)
}

/**
 * Regex pattern to match <think>...</think> tags (case-insensitive, global).
 * Captures the content between the opening and closing tags (captured group 1).
 *
 * Why: Anthropic's small-model reasoning variant (LFM2.5-1.2B-Thinking) includes
 * reasoning traces inside <think> tags. We extract these into a separate field
 * so the main content is clean and the reasoning is optionally available to the user.
 */
const THINK_REGEX = /<think>([\s\S]*?)<\/think>/gi;

/**
 * Extracts <think>...</think> reasoning tags from model output.
 *
 * Process:
 * 1. Return empty content if input is empty
 * 2. Find all <think>...</think> matches in the text
 * 3. Remove the tags from the text (replace with empty string)
 * 4. Join all extracted reasoning with double newlines
 * 5. Return { content: cleaned, reasoning: extracted or undefined }
 *
 * Why: The reasoning model outputs both hidden reasoning and the actual response.
 * Extracting reasoning separately lets the MCP client display them distinctly
 * (hidden reasoning can be shown in a collapsed section, the main response is prominent).
 *
 * Example:
 * Input: "I think X is true. <think>Let me verify: X implies Y. Y is true. So X is true.</think> Therefore, X."
 * Output: { content: "I think X is true. Therefore, X.", reasoning: "Let me verify: X implies Y. Y is true. So X is true." }
 *
 * @param content Text that may contain <think>...</think> tags
 * @returns Object with cleaned content and extracted reasoning (if any)
 */
export function stripThinkTags(content: string): ThinkSplit {
  if (!content) return { content: "" };

  // Collect all reasoning parts and remove the tags from the content
  const reasoningParts: string[] = [];
  const cleaned = content.replace(THINK_REGEX, (_, inner) => {
    reasoningParts.push(String(inner).trim());
    return "";
  });

  // Join all reasoning parts with double newlines for readability
  const reasoning = reasoningParts.join("\n\n").trim();

  return {
    content: cleaned.trim(),
    reasoning: reasoning.length > 0 ? reasoning : undefined,
  };
}
