/**
 * @fileoverview Configuration system for tools, models, and pricing.
 *
 * This is the central configuration hub: it defines what tools exist, which models
 * they use, and how much they cost. Two sources are supported:
 * - File-based: Node.js reads from dist/../config/catalog.json (used by local plugin)
 * - KV-based: Cloudflare Workers reads from a KV namespace (used by deployed Worker)
 *
 * Flow:
 * 1. Config is loaded from file or KV into a ZeroGpuConfig object
 * 2. ZeroGpuConfig is validated (all required fields, correct types)
 * 3. Hand...s use getModel(config, task) to look up which model to use
 * 4. savings.ts uses config.prices and config.baselinePrice for cost estimation
 *
 * Configuration is a JSON file with this shape (see below for full type definitions):
 * ```json
 * {
 *   "version": "2026-04-22",
 *   "priceTableVersion": "2026-04-22",
 *   "models": { "task_name": { "id": "model_id", "endpoint": "chat" }, ... },
 *   "prices": { "model_id": { "input": 0.001, "output": 0.002 }, ... },
 *   "defaultPrice": { "input": 0.001, "output": 0.002 },
 *   "baselinePrice": { "input": 0.003, "output": 0.015 },
 *   "tools": [{ "name": "zerogpu_chat", "handler": "chat", "title": "Chat", ... }, ...]
 * }
 * ```
 */

/** Endpoint type: which ZeroGPU API endpoint a model uses. */
export type Endpoint = "chat" | "responses";

/**
 * Reference to a model with its endpoint.
 * Used to route tasks to the correct model and API endpoint.
 */
export interface ModelRef {
  id: string;      // Model identifier (e.g., "t5-small", "gliner2-base-v1")
  endpoint: Endpoint; // API endpoint: "chat" or "responses"
}

/**
 * Pricing information for a single model or default tier.
 * Costs in USD per 1000 tokens (the industry-standard way to quote API pricing).
 */
export interface PriceEntry {
  input: number;   // Cost per 1000 input tokens (e.g., 0.00005 = $0.00005 per 1K)
  output: number;  // Cost per 1000 output tokens
}

export type ToolHandlerId =
  | "health"
  | "classifyIab"
  | "summarize"
  | "classifyZeroShot"
  | "extractEntities"
  | "extractJson"
  | "classifyStructured"
  | "generateFollowups"
  | "chat";

export interface ToolSpec {
  name: string;
  handler: ToolHandlerId;
  title: string;
  description: string;
}

export interface ZeroGpuConfig {
  version: string;
  priceTableVersion: string;
  models: Record<string, ModelRef>;
  prices: Record<string, PriceEntry>;
  defaultPrice: PriceEntry;
  baselinePrice: PriceEntry;
  tools: ToolSpec[];
}

export const CATALOG_KV_KEY = "catalog";

const VALID_HANDLERS: ReadonlySet<ToolHandlerId> = new Set<ToolHandlerId>([
  "health",
  "classifyIab",
  "summarize",
  "classifyZeroShot",
  "extractEntities",
  "extractJson",
  "classifyStructured",
  "generateFollowups",
  "chat",
]);

function isPriceEntry(value: unknown): value is PriceEntry {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return typeof p.input === "number" && typeof p.output === "number";
}

function isModelRef(value: unknown): value is ModelRef {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    m.id.length > 0 &&
    (m.endpoint === "chat" || m.endpoint === "responses")
  );
}

/**
 * Validates and parses a raw configuration object.
 *
 * Enforces the complete configuration schema:
 * - version and priceTableVersion (audit trail)
 * - models: task → ModelRef mapping
 * - prices: model → PriceEntry mapping
 * - defaultPrice: fallback for models without explicit pricing
 * - baselinePrice: Claude cost for comparison
 * - tools: array of ToolSpec (what tools to expose)
 *
 * Fails fast on validation errors, throwing with the first error message found.
 * This is intentional: we want operators to fix config issues immediately, not discover them piecemeal.
 *
 * Why strict validation: Invalid configuration would cause runtime errors during tool execution.
 * Catching it at load time prevents bad deployments.
 *
 * @param raw Parsed JSON configuration (typically from file or KV)
 * @returns Validated ZeroGpuConfig object
 * @throws {Error} If any part of the config is invalid
 */
export function validateConfig(raw: unknown): ZeroGpuConfig {
  if (!raw || typeof raw !== "object") {
    throw new Error("config: root must be an object");
  }
  const r = raw as Record<string, unknown>;

  if (typeof r.version !== "string" || !r.version) {
    throw new Error("config.version must be a non-empty string");
  }
  if (typeof r.priceTableVersion !== "string" || !r.priceTableVersion) {
    throw new Error("config.priceTableVersion must be a non-empty string");
  }
  if (!r.models || typeof r.models !== "object") {
    throw new Error("config.models must be an object");
  }
  const models: Record<string, ModelRef> = {};
  for (const [task, value] of Object.entries(r.models as Record<string, unknown>)) {
    if (!isModelRef(value)) {
      throw new Error(`config.models.${task} is invalid`);
    }
    models[task] = value;
  }

  if (!r.prices || typeof r.prices !== "object") {
    throw new Error("config.prices must be an object");
  }
  const prices: Record<string, PriceEntry> = {};
  for (const [model, value] of Object.entries(r.prices as Record<string, unknown>)) {
    if (!isPriceEntry(value)) {
      throw new Error(`config.prices.${model} is invalid`);
    }
    prices[model] = value;
  }

  if (!isPriceEntry(r.defaultPrice)) {
    throw new Error("config.defaultPrice is invalid");
  }
  if (!isPriceEntry(r.baselinePrice)) {
    throw new Error("config.baselinePrice is invalid");
  }

  if (!Array.isArray(r.tools) || r.tools.length === 0) {
    throw new Error("config.tools must be a non-empty array");
  }
  const tools: ToolSpec[] = [];
  const seen = new Set<string>();
  for (const entry of r.tools) {
    if (!entry || typeof entry !== "object") {
      throw new Error("config.tools entry must be an object");
    }
    const t = entry as Record<string, unknown>;
    if (typeof t.name !== "string" || !t.name) {
      throw new Error("tool.name must be a non-empty string");
    }
    if (typeof t.handler !== "string" || !VALID_HANDLERS.has(t.handler as ToolHandlerId)) {
      throw new Error(`tool.handler for ${t.name} is not a known handler id`);
    }
    if (typeof t.title !== "string" || !t.title) {
      throw new Error(`tool.title for ${t.name} must be a non-empty string`);
    }
    if (typeof t.description !== "string" || !t.description) {
      throw new Error(`tool.description for ${t.name} must be a non-empty string`);
    }
    if (seen.has(t.name)) {
      throw new Error(`duplicate tool name: ${t.name}`);
    }
    seen.add(t.name);
    tools.push({
      name: t.name,
      handler: t.handler as ToolHandlerId,
      title: t.title,
      description: t.description,
    });
  }

  return {
    version: r.version,
    priceTableVersion: r.priceTableVersion,
    models,
    prices,
    defaultPrice: r.defaultPrice,
    baselinePrice: r.baselinePrice,
    tools,
  };
}

/**
 * Interface for configuration sources.
 * Both file-based and KV-based providers implement this.
 */
export interface ConfigProvider {
  getConfig(): Promise<ZeroGpuConfig>;
}

/**
 * Type for Cloudflare KV-like objects (with minimal get() method).
 * This allows mocking in tests while working with real Cloudflare KV in production.
 */
interface KvLike {
  get(key: string, options?: { type: "json" } | { type: "text" }): Promise<unknown>;
}

/**
 * Options for KvConfigProvider.
 */
export interface KvConfigProviderOptions {
  kv: KvLike;              // KV namespace to read configuration from
  key?: string;            // KV key; defaults to "catalog"
  ttlMs?: number;          // Cache TTL in milliseconds; defaults to 60,000 (1 minute)
}

/** Default cache TTL: 1 minute. Short enough to catch config updates quickly. */
const DEFAULT_TTL_MS = 60_000;

/**
 * Configuration provider for Cloudflare Workers.
 * Reads configuration from a KV namespace with in-memory caching to reduce KV reads.
 *
 * Caching strategy:
 * - In-memory cache with TTL: reduces KV hits but catches updates within ttlMs
 * - Coalescing: if multiple requests arrive while a fetch is in-flight, they wait
 *   on the same promise (prevents thundering herd)
 * - After cache expiration: next request fetches fresh config from KV
 *
 * Why cache: KV reads have latency and quota. Caching for 1-5 minutes is a reasonable
 * tradeoff: operators can update config and it takes a few minutes to roll out.
 *
 * Error handling: If the config key doesn't exist in KV, throws with a helpful message
 * suggesting the user run the seed script.
 */
export class KvConfigProvider implements ConfigProvider {
  private readonly kv: KvLike;
  private readonly key: string;
  private readonly ttlMs: number;
  private cached: { value: ZeroGpuConfig; expiresAt: number } | null = null;
  private inflight: Promise<ZeroGpuConfig> | null = null;

  constructor(options: KvConfigProviderOptions) {
    this.kv = options.kv;
    this.key = options.key ?? CATALOG_KV_KEY;
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  }

  /**
   * Gets the configuration, using cache if fresh, otherwise fetching from KV.
   *
   * Three cases:
   * 1. Cache is fresh: return cached value immediately
   * 2. Fetch in-flight: wait for it (coalescing multiple requests)
   * 3. No cache or expired: fetch from KV, cache the result, return it
   *
   * @returns Configuration object
   * @throws {Error} If KV key doesn't exist or config is invalid
   */
  async getConfig(): Promise<ZeroGpuConfig> {
    const now = Date.now();

    // Case 1: Cache is fresh
    if (this.cached && this.cached.expiresAt > now) {
      return this.cached.value;
    }

    // Case 2: Fetch already in-flight (coalescing)
    if (this.inflight) return this.inflight;
    this.inflight = (async () => {
      const raw = await this.kv.get(this.key, { type: "json" });
      if (raw === null || raw === undefined) {
        throw new Error(
          `ZeroGPU config not found in KV (key=${this.key}). Run 'npm run kv:seed -- --env <env>' to publish config/catalog.json.`,
        );
      }
      const parsed = validateConfig(raw);
      this.cached = { value: parsed, expiresAt: Date.now() + this.ttlMs };
      return parsed;
    })();
    try {
      return await this.inflight;
    } finally {
      this.inflight = null;
    }
  }
}

/**
 * Configuration provider for Node.js (file-based).
 * Validates the config at construction time and serves it synchronously (wrapped in Promise for interface compatibility).
 *
 * Why simple: File-based config is loaded once at startup, so no caching is needed.
 * The Promise wrapper is just to match the ConfigProvider interface used by both Node and Worker.
 *
 * Used by: Node entry point (index.ts) which loads config from file and passes it here.
 */
export class StaticConfigProvider implements ConfigProvider {
  private readonly value: ZeroGpuConfig;

  /**
   * Validates the configuration immediately.
   * Fails fast if configuration is invalid, before the server starts.
   *
   * @param raw Parsed JSON configuration
   * @throws {Error} If configuration is invalid
   */
  constructor(raw: unknown) {
    this.value = validateConfig(raw);
  }

  /**
   * Returns the validated configuration.
   * Wrapped in Promise for interface compatibility with KvConfigProvider.
   *
   * @returns The configuration
   */
  async getConfig(): Promise<ZeroGpuConfig> {
    return this.value;
  }
}

/**
 * Looks up the model reference (ID and endpoint) for a given task.
 *
 * This is the central router: tools call this to find out which model to use
 * for their task. The mapping is defined in the configuration.
 *
 * @param config The configuration object
 * @param task Task name (e.g., "summarize", "classify_zero_shot")
 * @returns ModelRef with the model ID and endpoint
 * @throws {Error} If the task is not found in the configuration
 */
export function getModel(config: ZeroGpuConfig, task: string): ModelRef {
  const ref = config.models[task];
  if (!ref) throw new Error(`Unknown task: ${task}`);
  return ref;
}
