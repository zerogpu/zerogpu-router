import { z } from "zod";
import type { ZeroGpuClient } from "../zerogpuClient.js";
import { mcpError, mcpJson, runChat, stripThinkTags } from "./shared.js";

const chatMessage = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string(),
});

export const chatArgs = z
  .object({
    messages: z.array(chatMessage).min(1, "at least one message required"),
    thinking: z.boolean().optional(),
    model: z.string().min(1).optional(),
    max_tokens: z.number().int().positive().max(4096).optional(),
    temperature: z.number().min(0).max(2).optional(),
  })
  .strict();

export type ChatArgs = z.infer<typeof chatArgs>;

export async function chatHandler(client: ZeroGpuClient, args: ChatArgs) {
  try {
    const result = await runChat(client, {
      task: args.thinking ? "chat_thinking" : "chat",
      toolName: "zerogpu_chat",
      messages: args.messages,
      overrideModel: args.model,
      extra: {
        ...(args.max_tokens ? { max_tokens: args.max_tokens } : {}),
        ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
      },
    });

    const split = args.thinking ? stripThinkTags(result.content) : { content: result.content };

    return mcpJson({
      message: { role: "assistant", content: split.content },
      ...(split.reasoning ? { reasoning: split.reasoning } : {}),
      model: result.model,
      usage: result.usage,
      savings: result.savings,
    });
  } catch (err) {
    return mcpError((err as Error).message, { tool: "zerogpu_chat" });
  }
}
