/**
 * @fileoverview Health check tool.
 *
 * Pings the ZeroGPU backend to verify it's operational.
 * No arguments required; returns backend status and optional component details.
 *
 * Use cases:
 * - User wants to verify ZeroGPU is reachable before running expensive tasks
 * - Monitoring/alerting: poll health status regularly
 * - Debugging: confirm credentials and network connectivity are working
 */

import { z } from "zod";
import { mcpJson, mcpError, type HandlerContext } from "./shared.js";

/** Input schema: no arguments required (empty strict object). */
export const healthInputSchema = {};

/**
 * Health check handler.
 *
 * Process:
 * 1. Call client.health() to ping the ZeroGPU backend
 * 2. Return { status, components, raw } with the backend's response
 * 3. On error: return mcpError with the error message
 *
 * Why no runChat: Health check is simple (no model inference), so we don't
 * need the full orchestration that runChat provides (model lookup, timing, logging).
 * We just call the API directly and return the result.
 *
 * @param ctx Handler context (client)
 * @param _args Arguments (unused, the health endpoint takes no arguments)
 * @returns MCP response with status and components
 */
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

/** Zod schema for health endpoint arguments (empty, no-args endpoint). */
export const healthArgs = z.object({}).strict();
