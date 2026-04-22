import { z } from "zod";
import type { ZeroGpuClient } from "../zerogpuClient.js";
import { mcpJson, mcpError } from "./shared.js";

export const healthInputSchema = {};

export async function healthHandler(client: ZeroGpuClient, _args: Record<string, never>) {
  try {
    const response = await client.health();
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
