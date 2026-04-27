export type Endpoint = "chat" | "responses";

export interface ModelRef {
  id: string;
  endpoint: Endpoint;
}

export interface PriceEntry {
  input: number;
  output: number;
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

export interface ConfigProvider {
  getConfig(): Promise<ZeroGpuConfig>;
}

interface KvLike {
  get(key: string, options?: { type: "json" } | { type: "text" }): Promise<unknown>;
}

export interface KvConfigProviderOptions {
  kv: KvLike;
  key?: string;
  ttlMs?: number;
}

const DEFAULT_TTL_MS = 60_000;

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

  async getConfig(): Promise<ZeroGpuConfig> {
    const now = Date.now();
    if (this.cached && this.cached.expiresAt > now) {
      return this.cached.value;
    }
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

export class StaticConfigProvider implements ConfigProvider {
  private readonly value: ZeroGpuConfig;

  constructor(raw: unknown) {
    this.value = validateConfig(raw);
  }

  async getConfig(): Promise<ZeroGpuConfig> {
    return this.value;
  }
}


export function getModel(config: ZeroGpuConfig, task: string): ModelRef {
  const ref = config.models[task];
  if (!ref) throw new Error(`Unknown task: ${task}`);
  return ref;
}
