import { z } from "zod";
import { mcpJson, mcpError, type HandlerContext } from "./shared.js";

export const healthInputSchema = {};

export async function healthHandler(ctx: HandlerContext, _args: Record<string, never>) {
  try {
    const response = await ctx.client.health();
    return mcpJson({
      status: response.status,
      components: response.components ?? {},
      raw: response,
    });
  } catch (err) {
    return mcpError((err as Error).message, { cause: "health_check_failed" });
  }
}

export const healthArgs = z.object({}).strict();
