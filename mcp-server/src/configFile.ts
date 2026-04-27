/**
 * @fileoverview File-based configuration loading for Node.js.
 *
 * Separated from config.ts to keep Node-only dependencies (fs/promises) out of
 * the shared config module. This allows the Worker tsconfig to compile config.ts
 * without pulling in Node types.
 */

import { readFile } from "node:fs/promises";
import { StaticConfigProvider } from "./config.js";

/**
 * Loads and parses the configuration from a JSON file on disk.
 *
 * Process:
 * 1. Read the file asynchronously
 * 2. Parse it as JSON
 * 3. Pass the parsed object to StaticConfigProvider (which validates it)
 * 4. Return the provider
 *
 * Why a separate function: Keeps Node.js fs imports out of the shared config module.
 * The main config.ts module can be used by both Node and Cloudflare Workers;
 * the file loading is Node-specific and lives here.
 *
 * Error handling: Wraps JSON parse errors with the file path for clarity.
 * Validation errors from StaticConfigProvider are re-thrown as-is (already clear).
 *
 * @param path Absolute path to the configuration JSON file
 * @returns Provider that serves the loaded configuration
 * @throws {Error} If the file can't be read or JSON parsing fails
 */
export async function loadConfigFromFile(path: string): Promise<StaticConfigProvider> {
  // Read the file asynchronously
  const contents = await readFile(path, "utf8");

  // Parse as JSON with error context
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (err) {
    throw new Error(`Failed to parse config file at ${path}: ${(err as Error).message}`);
  }

  // Validate and wrap in a provider (throws if invalid)
  return new StaticConfigProvider(parsed);
}
