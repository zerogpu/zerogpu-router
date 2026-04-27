export interface SafeJsonResult<T = unknown> {
  parsed: T | null;
  raw: string;
  ok: boolean;
}

const JSON_FENCE = /^\s*```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i;

export function stripCodeFence(text: string): string {
  const match = text.match(JSON_FENCE);
  return match ? match[1].trim() : text.trim();
}

export function safeJsonParse<T = unknown>(text: string): SafeJsonResult<T> {
  const raw = text ?? "";
  const candidate = stripCodeFence(raw);
  try {
    return { parsed: JSON.parse(candidate) as T, raw, ok: true };
  } catch {
    return { parsed: null, raw, ok: false };
  }
}

export interface ThinkSplit {
  content: string;
  reasoning?: string;
}

const THINK_REGEX = /<think>([\s\S]*?)<\/think>/gi;

export function stripThinkTags(content: string): ThinkSplit {
  if (!content) return { content: "" };
  const reasoningParts: string[] = [];
  const cleaned = content.replace(THINK_REGEX, (_, inner) => {
    reasoningParts.push(String(inner).trim());
    return "";
  });
  const reasoning = reasoningParts.join("\n\n").trim();
  return {
    content: cleaned.trim(),
    reasoning: reasoning.length > 0 ? reasoning : undefined,
  };
}
