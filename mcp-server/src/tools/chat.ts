/**
 * @fileoverview General-purpose chat and inference tool.
 *
 * Provides direct access to the ZeroGPU small language models for any task:
 * - Simple chat and conversation
 * - Reasoning (with thinking enabled)
 * - Custom prompts
 * - Fine-grained control over temperature and token limits
 *
 * This is the fallback tool when a more specific tool doesn't fit the task.
 */

import { z } from "zod";
import { mcpError, mcpJson, runChat, stripThinkTags, type HandlerContext } from "./shared.js";

/** Schema for a single chat message (OpenAI compatible format). */
const chatMessage = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string(),
});

/** Input schema: chat messages, optional thinking mode, optional model override, optional sampling params. */
export const chatArgs = z
  .object({
    messages: z.array(chatMessage).min(1, "at least one message required"),
    thinking: z.boolean().optional(),         // Enable reasoning mode (slower, more thorough)
    model: z.string().min(1).optional(),      // Override the default model
    max_tokens: z.number().int().positive().max(4096).optional(), // Max output length
    temperature: z.number().min(0).max(2).optional(), // Sampling randomness (0=deterministic, 2=very random)
  })
  .strict();

export type ChatArgs = z.infer<typeof chatArgs>;

/**
 * General-purpose chat handler.
 *
 * Process:
 * 1. Determine the task (normal chat or reasoning chat)
 * 2. Call runChat with the messages and optional model override
 * 3. If thinking mode: extract reasoning from <think>...</think> tags
 * 4. Return the assistant message and optional reasoning
 * 5. Include model info and cost/savings for transparency
 *
 * Why thinking mode: Some tasks benefit from explicit reasoning. The thinking variant
 * of the model outputs internal reasoning in <think> tags, which we extract and
 * present separately so users can see how the model arrived at its answer.
 *
 * Why model override: Advanced users may want to experiment with different small models
 * or route to a specific version. This parameter provides that flexibility while the
 * default behavior (no override) works for general users.
 *
 * Why temperature control: Allows users to tune randomness:
 * - temperature=0: Deterministic, always picks highest-probability token (best for facts)
 * - temperature=1: Balanced (default)
 * - temperature=2: Very random, creative (best for brainstorming)
 *
 * @param ctx Handler context
 * @param args Chat messages, optional thinking/model/sampling parameters
 * @returns Assistant message, optional reasoning (if thinking enabled), model info, cost
 */
export async function chatHandler(ctx: HandlerContext, args: ChatArgs) {
  try {
    const result = await runChat(ctx, {
      // Route to the thinking variant if reasoning is requested
      task: args.thinking ? "chat_thinking" : "chat",
      toolName: "zerogpu_chat",
      messages: args.messages,
      // Allow user to override the model (for experimentation)
      overrideModel: args.model,
      // Pass sampling parameters (only if provided)
      extra: {
        ...(args.max_tokens ? { max_tokens: args.max_tokens } : {}),
        ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
      },
    });

    // Extract reasoning if thinking mode is enabled
    // The thinking model outputs reasoning in <think>...</think> tags
    const split = args.thinking ? stripThinkTags(result.content) : { content: result.content };

    return mcpJson({
      message: { role: "assistant", content: split.content }, // The response
      ...(split.reasoning ? { reasoning: split.reasoning } : {}), // Optional reasoning trace
      model: result.model,
      usage: result.usage,
      savings: result.savings,
    });
  } catch (err) {
    return mcpError((err as Error).message, { tool: "zerogpu_chat" });
  }
}
