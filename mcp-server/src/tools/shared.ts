import type { ConfigProvider, ZeroGpuConfig } from "../config.js";
import { getModel } from "../config.js";
import type { Task } from "../modelCatalog.js";
import { safeJsonParse, stripThinkTags } from "../parsers.js";
import { computeSavings, logSavings, type SavingsSummary } from "../savings.js";
import type {
  ChatCompletionsRequest,
  ChatCompletionsResponse,
  ChatMessage,
  ZeroGpuClient,
} from "../zerogpuClient.js";

export interface HandlerContext {
  client: ZeroGpuClient;
  configProvider: ConfigProvider;
}

export interface RunArgs {
  task: Task;
  toolName: string;
  messages: ChatMessage[];
  extra?: Partial<ChatCompletionsRequest>;
  overrideModel?: string;
}

export interface RunResult {
  raw: ChatCompletionsResponse;
  content: string;
  model: string;
  usage: ChatCompletionsResponse["usage"];
  savings: SavingsSummary;
  latencyMs: number;
}

export async function runChat(ctx: HandlerContext, args: RunArgs): Promise<RunResult> {
  const config: ZeroGpuConfig = await ctx.configProvider.getConfig();
  const ref = getModel(config, args.task);
  const modelId = args.overrideModel ?? ref.id;
  const body: ChatCompletionsRequest = {
    model: modelId,
    messages: args.messages,
    ...(args.extra ?? {}),
  };

  const started = Date.now();
  const response =
    ref.endpoint === "chat"
      ? await ctx.client.chatCompletions(body)
      : await ctx.client.responses(body);
  const latencyMs = Date.now() - started;

  const content = response.choices?.[0]?.message?.content ?? "";
  const savings = computeSavings(config, response.model ?? modelId, response.usage);

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

export { safeJsonParse, stripThinkTags };
