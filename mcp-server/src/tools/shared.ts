/**
 * @fileoverview Shared utilities for all tool handlers.
 *
 * Provides:
 * 1. HandlerContext: Injected into every tool handler (client, config)
 * 2. runChat: Orchestrates a backend call (model lookup, timing, logging, result extraction)
 * 3. MCP response helpers: mcpJson, mcpError (format results for MCP client)
 * 4. Re-exports of parser utilities (safeJsonParse, stripThinkTags)
 *
 * Why shared: All 9 tools follow the same pattern: validate input, call runChat with
 * task-specific parameters, format and return the result. This file abstracts that pattern.
 */

import type { ConfigProvider, ZeroGpuConfig } from "../config.js";
import { getModel } from "../config.js";
import type { Task } from "../modelCatalog.js";
import { safeJsonParse, stripThinkTags } from "../parsers.js";
import { computeSavings, logSavings, type SavingsSummary } from "../savings.js";
import type {
  ChatCompletionsMetadata,
  ChatCompletionsRequest,
  ChatCompletionsResponse,
  ChatMessage,
  ZeroGpuClient,
} from "../zerogpuClient.js";

/**
 * Context passed to every tool handler.
 * Contains the two main resources handlers need: API client and configuration.
 */
export interface HandlerContext {
  client: ZeroGpuClient;           // HTTP client for ZeroGPU backend calls
  configProvider: ConfigProvider;  // Source of model catalog and pricing config
}

/**
 * Arguments for the runChat helper function.
 * Encapsulates the task-specific parameters so handlers don't need to know
 * the internals of backend communication, timing, or logging.
 */
export interface RunArgs {
  task: Task;                              // Task name (e.g., "summarize", "classify_zero_shot")
  toolName: string;                        // Tool name for logging (e.g., "zerogpu_summarize")
  messages: ChatMessage[];                 // Chat messages to send to the model
  metadata?: ChatCompletionsMetadata;      // Task-specific options sent under `metadata`
  extra?: Partial<ChatCompletionsRequest>; // Other top-level body fields (rare; e.g., max_tokens)
  overrideModel?: string;                  // Optional: use a different model (for testing)
}

/**
 * Complete result of a backend call.
 * Includes raw response, extracted content, model info, and cost/savings breakdown.
 */
export interface RunResult {
  raw: ChatCompletionsResponse;  // Full backend response (for debugging)
  content: string;               // Extracted text content from response
  model: string;                 // Model ID that produced the response
  usage: ChatCompletionsResponse["usage"]; // Token counts (input + output)
  savings: SavingsSummary;       // Cost and savings breakdown
  latencyMs: number;             // End-to-end latency (backend only, not including network)
}

/**
 * Orchestrates a call to the ZeroGPU backend and collects all necessary metadata.
 *
 * High-level process:
 * 1. Load configuration (model catalog, pricing)
 * 2. Look up the model to use for this task
 * 3. Build a request body (model + messages + extra options)
 * 4. Time the backend call (start → request → end)
 * 5. Route to correct endpoint (chatCompletions vs responses) based on model config
 * 6. Extract content from the response (handle missing/malformed responses)
 * 7. Compute cost/savings breakdown using the pricing config
 * 8. Log the savings entry (for observability)
 * 9. Return result with all metadata
 *
 * Why centralize this: All tools follow this exact pattern. Centralizing it here
 * means consistent timing, logging, error handling, and result extraction across all tools.
 *
 * Why separate timing: Measures only backend latency (not handler setup, logging, etc.).
 * This gives a fair comparison of model inference speed.
 *
 * Why always log savings: Even before returning to the user, we log the cost/savings.
 * This ensures complete observability regardless of what the handler does next.
 *
 * @param ctx Handler context (client and config)
 * @param args Task-specific parameters (task name, messages, options)
 * @returns Complete result with content, model info, and cost/savings
 * @throws {ZeroGpuError} If the backend call fails
 */
export async function runChat(ctx: HandlerContext, args: RunArgs): Promise<RunResult> {
  // Load configuration (model catalog + pricing)
  const config: ZeroGpuConfig = await ctx.configProvider.getConfig();

  // Look up the model for this task in the catalog
  const ref = getModel(config, args.task);
  const modelId = args.overrideModel ?? ref.id;

  // Build the request body. Task-specific options live under `metadata`;
  // `extra` is reserved for the rare top-level fields (e.g., max_tokens).
  const body: ChatCompletionsRequest = {
    model: modelId,
    messages: args.messages,
    ...(args.metadata ? { metadata: args.metadata } : {}),
    ...(args.extra ?? {}),
  };

  // Time the backend call
  const started = Date.now();
  const response =
    ref.endpoint === "chat"
      ? await ctx.client.chatCompletions(body)  // For chat/text tasks
      : await ctx.client.responses(body);       // For structured extraction tasks
  const latencyMs = Date.now() - started;

  // Extract content from the response (with fallback to empty string)
  const content = response.choices?.[0]?.message?.content ?? "";

  // Compute cost/savings using the pricing config
  const savings = computeSavings(config, response.model ?? modelId, response.usage);

  // Log the savings entry for observability
  logSavings({
    tool: args.toolName,
    model: response.model ?? modelId,
    latency_ms: latencyMs,
    ...savings,
  });

  return {
    raw: response,
    content,
    model: response.model ?? modelId,
    usage: response.usage,
    savings,
    latencyMs,
  };
}

/**
 * Formats a payload as an MCP text response (success case).
 *
 * MCP client protocol requires results to be wrapped in a content array with type "text".
 * This helper does that wrapping, with nice JSON formatting for readability.
 *
 * @param payload Object to serialize and return (typically { field1: value1, ... })
 * @returns MCP-formatted response object
 */
export function mcpJson(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

/**
 * Formats an error message as an MCP error response.
 *
 * Wraps the error in MCP's standard format (isError: true) and optionally
 * includes extra fields (e.g., cause, context) for debugging.
 *
 * MCP client sees isError: true and knows to display this as an error
 * (e.g., red text, error icon) rather than a successful tool result.
 *
 * @param message Human-readable error message
 * @param extra Optional additional fields to include in the response
 * @returns MCP-formatted error response object
 */
export function mcpError(message: string, extra?: Record<string, unknown>) {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ error: message, ...(extra ?? {}) }, null, 2),
      },
    ],
  };
}

// Re-export parser utilities so tools can use them without importing from parsers.ts
export { safeJsonParse, stripThinkTags };
