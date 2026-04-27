import { readFile } from "node:fs/promises";
import { StaticConfigProvider } from "./config.js";

// Node-only helper for loading the catalog JSON from disk. Kept out of config.ts
// so the Worker tsconfig can compile without Node types.
export async function loadConfigFromFile(path: string): Promise<StaticConfigProvider> {
  const contents = await readFile(path, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (err) {
    throw new Error(`Failed to parse config file at ${path}: ${(err as Error).message}`);
  }
  return new StaticConfigProvider(parsed);
}
