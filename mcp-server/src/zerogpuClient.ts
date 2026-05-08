/**
 * @fileoverview HTTP client for the ZeroGPU Orchestration API.
 *
 * Provides a type-safe wrapper around the ZeroGPU API with:
 * - Automatic request/response serialization
 * - Authentication header injection (x-api-key, x-project-id)
 * - Timeout enforcement via AbortController
 * - Automatic retry on transient failures (429, 502, 503, 504)
 * - Exponential backoff with jitter between retries
 * - Structured error responses (ZeroGpuError with status, excerpt, cause)
 */

/**
 * Configuration options for ZeroGpuClient.
 * All fields are required; missing config will cause the constructor to throw.
 */
export interface ZeroGpuClientConfig {
  baseUrl: string;          // Base URL of the ZeroGPU API (e.g., https://api.zerogpu.com)
  apiKey: string;            // API key for authentication (sent as x-api-key header)
  projectId: string;         // Project ID for authentication (sent as x-project-id header)
  timeoutMs?: number;        // Request timeout in milliseconds; defaults to 30,000
  maxRetries?: number;       // Maximum number of retry attempts; defaults to 3
}

/**
 * A message in a chat completion request.
 * Mirrors the OpenAI chat completion API format.
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

/**
 * Task-specific options sent to the backend in the `metadata` field.
 *
 * All GLiNER usecases carry their parameters here so the top-level body stays
 * minimal and uniform across tools. Examples:
 * - usecase "ner" + labels (+ threshold): Entity recognition
 * - usecase "json" + schema: Structured JSON extraction
 * - usecase "classification" + schema: Multi-axis classification
 * - usecase "redact" + mask: PII redaction
 * - usecase "extract-pii" + categories (+ threshold): PII extraction
 */
export interface ChatCompletionsMetadata {
  usecase?: "ner" | "classification" | "json" | "redact" | "extract-pii";
  labels?: string[];                  // NER label set
  schema?: Record<string, string[]>;  // JSON / classification schema
  threshold?: number;                 // Confidence cutoff
  mask?: string;                      // PII redact mask mode (e.g., "label")
  categories?: string[];              // PII extract categories (e.g., ["identity","contact"])
  [key: string]: unknown;             // Allow other fields for extensibility
}

/**
 * Request body for chat completion or structured extraction.
 *
 * Every tool sends an OpenAI-style `messages` array; task-specific options
 * (usecase, labels, schema, threshold, mask, categories) always live inside
 * `metadata` rather than at the top level.
 */
export interface ChatCompletionsRequest {
  model: string;                              // Model ID (e.g., "t5-small", "gliner2-base-v1")
  messages: ChatMessage[];                    // Chat history in OpenAI format
  metadata?: ChatCompletionsMetadata;         // Task-specific options (usecase, labels, schema, ...)
  max_tokens?: number;                        // Max tokens in response
  temperature?: number;                       // Sampling temperature (0-2)
  [key: string]: unknown;                     // Allow other fields for extensibility
}

/**
 * Token usage statistics from a response.
 * Not all models/endpoints populate all fields.
 */
export interface ChatCompletionsUsage {
  prompt_tokens?: number;       // Tokens in the input
  completion_tokens?: number;   // Tokens in the output
  total_tokens?: number;        // Sum of prompt + completion
  [key: string]: unknown;       // Allow other fields for extensibility
}

/**
 * Response from a chat completion or extraction endpoint.
 */
export interface ChatCompletionsResponse {
  id?: string;                  // Response ID (may be empty for some models)
  model: string;                // The model that produced this response
  choices: Array<{
    index?: number;             // Choice index (usually 0 for single-choice responses)
    message: ChatMessage;       // The generated message
    finish_reason?: string;     // Why the response ended (e.g., "stop", "length")
  }>;
  usage?: ChatCompletionsUsage; // Token statistics
  [key: string]: unknown;       // Allow other fields for extensibility
}

/**
 * Health check response from the ZeroGPU backend.
 * Used to validate that the API is reachable and operational.
 */
export interface HealthResponse {
  status: string;               // Status string (e.g., "ok", "degraded")
  components?: Record<string, unknown>; // Optional per-component status details
  [key: string]: unknown;       // Allow other fields for extensibility
}

/**
 * Custom error class for ZeroGPU API failures.
 *
 * Captures:
 * - Human-readable error message
 * - HTTP status code (0 for network errors)
 * - First 500 chars of response body (for debugging)
 * - Original error cause (for network or timeout errors)
 *
 * Why: Distinguishes ZeroGPU-specific errors from generic errors so callers
 * can decide whether to retry, fallback, or report to the user.
 */
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

/**
 * HTTP status codes that indicate transient failures and should trigger a retry.
 * - 429: Too Many Requests (rate limited)
 * - 502: Bad Gateway
 * - 503: Service Unavailable
 * - 504: Gateway Timeout
 *
 * Why: These are temporary failures that often succeed on retry. Permanent errors
 * (4xx except 429, 5xx except 502/503/504) should fail immediately.
 */
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

/** Default request timeout in milliseconds. Sufficient for most model inference. */
const DEFAULT_TIMEOUT_MS = 30_000;

/** Default number of retry attempts. Balances resilience with response time. */
const DEFAULT_MAX_RETRIES = 3;

/**
 * Delays execution for the specified number of milliseconds.
 * Used between retry attempts to avoid overwhelming the backend.
 *
 * Why: Simple Promise-based sleep is cleaner than complex setTimeout handling.
 *
 * @param ms Number of milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates exponential backoff delay with jitter for retry attempts.
 *
 * Formula: base delay + random jitter
 * - base delay = 400 * 2^attempt (e.g., attempt 0 = 400ms, attempt 1 = 800ms, attempt 2 = 1600ms)
 * - random jitter = 0-200ms (to avoid thundering herd when multiple clients retry together)
 *
 * Why: Exponential backoff prevents overwhelming a recovering backend; jitter
 * prevents synchronized retries from multiple clients from causing new spikes.
 * This is the standard pattern for retry logic in distributed systems.
 *
 * @param attempt Zero-indexed attempt number (0 for first retry, 1 for second, etc.)
 * @returns Delay in milliseconds
 */
function backoffDelay(attempt: number): number {
  const base = 400 * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 200);
  return base + jitter;
}

/**
 * HTTP client for the ZeroGPU Orchestration API.
 *
 * Provides public methods for three operations:
 * - chatCompletions: For general chat and small-model inference
 * - responses: For structured extraction tasks
 * - health: For backend health checks
 *
 * All methods handle:
 * - Authentication: Injects x-api-key and x-project-id headers
 * - Timeouts: Aborts requests that exceed the timeout window
 * - Retries: Automatically retries transient failures with exponential backoff
 * - Error conversion: Wraps HTTP and network errors in ZeroGpuError
 *
 * Why this layer: The MCP server delegates all backend communication to this client.
 * Centralizing it here means retry logic, auth, and timeouts are consistent
 * across all tools and not duplicated in each tool handler.
 */
export class ZeroGpuClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly projectId: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  /**
   * Creates a new ZeroGpuClient instance.
   *
   * Validates that all required fields are present (baseUrl, apiKey, projectId).
   * Trims trailing slashes from baseUrl so that appending paths works correctly.
   * Falls back to default timeout and retry values if not provided.
   *
   * Why fail in the constructor: Makes it explicit that a ZeroGpuClient without
   * credentials is not a valid state. Prevents late failures during tool execution.
   *
   * @param config Configuration object with credentials and optional timeout/retry settings
   * @throws {Error} If baseUrl, apiKey, or projectId are missing
   */
  constructor(config: ZeroGpuClientConfig) {
    if (!config.baseUrl) throw new Error("ZeroGpuClient: baseUrl is required");
    if (!config.apiKey) throw new Error("ZeroGpuClient: apiKey is required");
    if (!config.projectId) throw new Error("ZeroGpuClient: projectId is required");

    // Normalize the base URL: remove trailing slashes so path concatenation is predictable
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.projectId = config.projectId;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  /**
   * Calls the /v1/chat/completions endpoint for general chat completion and inference.
   *
   * This endpoint is used for most small-model tasks that expect a text response
   * (summarization, chat, followup generation, etc.).
   *
   * @param body The request body with model, messages, and task-specific options
   * @returns Promise resolving to the model's response with usage stats
   * @throws {ZeroGpuError} If the request fails or times out
   */
  async chatCompletions(body: ChatCompletionsRequest): Promise<ChatCompletionsResponse> {
    return this.post<ChatCompletionsResponse>("/v1/chat/completions", body);
  }

  /**
   * Calls the /v1/responses endpoint for structured extraction tasks.
   *
   * This endpoint is used for tasks that extract structured data (JSON, entities, classifications)
   * from text. It's a specialized endpoint that the backend may handle differently than chatCompletions.
   *
   * @param body The request body with model, messages, schema/labels, and extraction options
   * @returns Promise resolving to the extracted/classified data with usage stats
   * @throws {ZeroGpuError} If the request fails or times out
   */
  async responses(body: ChatCompletionsRequest): Promise<ChatCompletionsResponse> {
    return this.post<ChatCompletionsResponse>("/v1/responses", body);
  }

  /**
   * Calls the /health endpoint to check backend availability.
   *
   * Returns the operational status of the ZeroGPU backend and optionally per-component status.
   * Used by the zerogpu_health tool to provide real-time backend health to users.
   *
   * @returns Promise resolving to the health status object
   * @throws {ZeroGpuError} If the backend is unreachable or unhealthy
   */
  async health(): Promise<HealthResponse> {
    return this.get<HealthResponse>("/health");
  }

  /**
   * Makes a GET request to the specified path.
   *
   * @param path URL path (e.g., "/health")
   * @returns Promise resolving to the parsed JSON response
   * @throws {ZeroGpuError} On network error, timeout, or non-2xx response
   */
  private async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  /**
   * Makes a POST request to the specified path with a JSON body.
   *
   * @param path URL path (e.g., "/v1/chat/completions")
   * @param body Object to be serialized as JSON in the request body
   * @returns Promise resolving to the parsed JSON response
   * @throws {ZeroGpuError} On network error, timeout, or non-2xx response
   */
  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  /**
   * Makes an HTTP request to the ZeroGPU backend with automatic retry and timeout handling.
   *
   * Orchestrates the complete request/retry loop:
   * 1. On each attempt, creates an AbortController with a timeout
   * 2. Adds authentication headers (x-api-key, x-project-id)
   * 3. POSTs or GETs the URL with JSON serialization
   * 4. On success (2xx): parses and returns the JSON response
   * 5. On transient failure (429/502/503/504) and retries remaining: sleeps with backoff, then retries
   * 6. On permanent failure (other 4xx/5xx) or network error: converts to ZeroGpuError and throws
   * 7. After all retries exhausted: throws ZeroGpuError with "exhausted retries" message
   *
   * Timeout behavior:
   * - Uses AbortController signal (not a simple timeout) so the fetch itself is canceled
   * - Prevents hanging requests from stalling the MCP client
   * - On abort (timeout), caught as AbortError and converted to ZeroGpuError
   *
   * Retry behavior:
   * - Retryable statuses: 429 (rate limit), 502/503/504 (temporary backend issues)
   * - Non-retryable: 4xx except 429 (client errors), other 5xx (permanent failures)
   * - Backoff: exponential (400ms * 2^attempt + jitter) between attempts
   * - Max attempts: 1 + this.maxRetries (e.g., 1 initial + 3 retries = 4 total attempts)
   *
   * Why this design:
   * - AbortController is the standard way to cancel fetch in Node and browsers
   * - Exponential backoff prevents overwhelming a recovering backend
   * - Jitter prevents synchronized retries from multiple clients
   * - Distinguishing retryable vs permanent failures avoids wasting time on doomed requests
   *
   * @param method "GET" or "POST"
   * @param path URL path relative to baseUrl
   * @param body Optional request body (serialized to JSON)
   * @returns Promise resolving to the parsed response
   * @throws {ZeroGpuError} With status code, body excerpt (first 500 chars), and cause
   */
  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let lastError: unknown;

    // Attempt loop: initial attempt + retries
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      // Set up timeout using AbortController (standard DOM/Node API)
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        // Make the fetch request with authentication headers and abort signal
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

        // Success case: 2xx response
        if (response.ok) {
          return (await response.json()) as T;
        }

        // Non-success response: extract error details for logging
        const text = await response.text().catch(() => "");
        const excerpt = text.slice(0, 500);

        // Retry logic: if this status is retryable AND we have retries left, sleep and retry
        if (RETRYABLE_STATUS.has(response.status) && attempt < this.maxRetries) {
          // Sleep before next attempt with exponential backoff
          await sleep(backoffDelay(attempt));
          continue;
        }

        // Non-retryable error: throw immediately
        throw new ZeroGpuError(
          `ZeroGPU upstream ${method} ${path} failed: ${response.status}`,
          response.status,
          excerpt,
        );
      } catch (err) {
        // Already a ZeroGpuError: re-throw it (don't double-wrap)
        if (err instanceof ZeroGpuError) throw err;

        // Classify the error to provide a better error message
        const isAbort = (err as { name?: string } | undefined)?.name === "AbortError";
        lastError = err;

        // If we have retries left, sleep and try again
        if (attempt < this.maxRetries) {
          await sleep(backoffDelay(attempt));
          continue;
        }

        // No retries left: throw with appropriate message
        throw new ZeroGpuError(
          isAbort
            ? `ZeroGPU upstream ${method} ${path} timed out after ${this.timeoutMs}ms`
            : `ZeroGPU upstream ${method} ${path} network error`,
          0,
          undefined,
          err,
        );
      } finally {
        // Clean up the timeout in all cases (success, error, or abort)
        clearTimeout(timer);
      }
    }

    // Fallback: should be unreachable due to the throw in the catch block above,
    // but included for type safety and clarity
    throw new ZeroGpuError(
      `ZeroGPU upstream ${method} ${path} exhausted retries`,
      0,
      undefined,
      lastError,
    );
  }
}
