export interface ZeroGpuClientConfig {
  baseUrl: string;
  apiKey: string;
  projectId: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface ChatCompletionsRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  usecase?: "ner" | "classification" | "json";
  labels?: string[];
  schema?: Record<string, string[]>;
  threshold?: number;
  [key: string]: unknown;
}

export interface ChatCompletionsUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  [key: string]: unknown;
}

export interface ChatCompletionsResponse {
  id?: string;
  model: string;
  choices: Array<{
    index?: number;
    message: ChatMessage;
    finish_reason?: string;
  }>;
  usage?: ChatCompletionsUsage;
  [key: string]: unknown;
}

export interface HealthResponse {
  status: string;
  components?: Record<string, unknown>;
  [key: string]: unknown;
}

export class ZeroGpuError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly bodyExcerpt?: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ZeroGpuError";
  }
}

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number): number {
  const base = 400 * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 200);
  return base + jitter;
}

export class ZeroGpuClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly projectId: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config: ZeroGpuClientConfig) {
    if (!config.baseUrl) throw new Error("ZeroGpuClient: baseUrl is required");
    if (!config.apiKey) throw new Error("ZeroGpuClient: apiKey is required");
    if (!config.projectId) throw new Error("ZeroGpuClient: projectId is required");
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.projectId = config.projectId;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  async chatCompletions(body: ChatCompletionsRequest): Promise<ChatCompletionsResponse> {
    return this.post<ChatCompletionsResponse>("/v1/chat/completions", body);
  }

  async responses(body: ChatCompletionsRequest): Promise<ChatCompletionsResponse> {
    return this.post<ChatCompletionsResponse>("/v1/responses", body);
  }

  async health(): Promise<HealthResponse> {
    return this.get<HealthResponse>("/health");
  }

  private async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(url, {
          method,
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            "x-api-key": this.apiKey,
            "x-project-id": this.projectId,
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        if (response.ok) {
          return (await response.json()) as T;
        }

        const text = await response.text().catch(() => "");
        const excerpt = text.slice(0, 500);

        if (RETRYABLE_STATUS.has(response.status) && attempt < this.maxRetries) {
          await sleep(backoffDelay(attempt));
          continue;
        }

        throw new ZeroGpuError(
          `ZeroGPU upstream ${method} ${path} failed: ${response.status}`,
          response.status,
          excerpt,
        );
      } catch (err) {
        if (err instanceof ZeroGpuError) throw err;
        const isAbort = (err as { name?: string } | undefined)?.name === "AbortError";
        lastError = err;
        if (attempt < this.maxRetries) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        throw new ZeroGpuError(
          isAbort
            ? `ZeroGPU upstream ${method} ${path} timed out after ${this.timeoutMs}ms`
            : `ZeroGPU upstream ${method} ${path} network error`,
          0,
          undefined,
          err,
        );
      } finally {
        clearTimeout(timer);
      }
    }

    throw new ZeroGpuError(
      `ZeroGPU upstream ${method} ${path} exhausted retries`,
      0,
      undefined,
      lastError,
    );
  }
}
