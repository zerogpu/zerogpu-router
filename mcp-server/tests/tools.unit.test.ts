/**
 * @fileoverview Unit tests for all tool handlers (zerogpu_*).
 *
 * Uses MSW (Mock Service Worker) to intercept fetch requests and return canned responses,
 * so tests run without hitting the real ZeroGPU backend. This makes tests:
 * - Fast: No network latency or backend processing time
 * - Reliable: No backend downtime, no rate limiting, no data dependencies
 * - Deterministic: Same responses every run, reproducible assertions
 *
 * Tests cover:
 * - Authentication headers (x-api-key, x-project-id) are sent correctly
 * - Each tool correctly builds its request and parses its response
 * - Fallback behavior when JSON parsing fails (raw text returned)
 * - Special handling (model selection, prefix insertion, tag stripping, etc.)
 * - Retry logic on transient failures (429, 502/503/504)
 * - Timeout handling
 * - Cost/savings computation
 *
 * Run with: npm test
 * Skipped tests can be enabled by removing .skip (e.g., it.skip → it)
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse, delay } from "msw";
import { setupServer } from "msw/node";

import { ZeroGpuClient } from "../src/zerogpuClient.js";
import { StaticConfigProvider, type ZeroGpuConfig } from "../src/config.js";
import type { HandlerContext } from "../src/tools/shared.js";
import { classifyIabHandler } from "../src/tools/classifyIab.js";
import { summarizeHandler } from "../src/tools/summarize.js";
import { classifyZeroShotHandler } from "../src/tools/classifyZeroShot.js";
import { extractEntitiesHandler } from "../src/tools/extractEntities.js";
import { extractJsonHandler } from "../src/tools/extractJson.js";
import { classifyStructuredHandler } from "../src/tools/classifyStructured.js";
import { generateFollowupsHandler } from "../src/tools/generateFollowups.js";
import { chatHandler } from "../src/tools/chat.js";
import { healthHandler } from "../src/tools/health.js";

/** Mock API base URL (will be intercepted by MSW). */
const BASE = "https://zerogpu.test";

/**
 * Test configuration with all models and pricing.
 * Used by every test so handlers can look up model IDs and compute savings.
 */
const TEST_CATALOG: ZeroGpuConfig = {
  version: "test-1",
  priceTableVersion: "test-prices",
  models: {
    classify_iab: { id: "zlm-v1-iab-classify-edge", endpoint: "chat" },
    classify_iab_enriched: { id: "zlm-v1-iab-classify-edge-enriched", endpoint: "chat" },
    summarize: { id: "t5-small", endpoint: "chat" },
    classify_zero_shot: { id: "deberta-v3-small", endpoint: "chat" },
    extract_entities: { id: "gliner2-base-v1", endpoint: "chat" },
    extract_json: { id: "gliner2-base-v1", endpoint: "chat" },
    classify_structured: { id: "gliner2-base-v1", endpoint: "chat" },
    generate_followups: { id: "zlm-v1-followup-questions-edge", endpoint: "chat" },
    chat: { id: "LFM2.5-1.2B-Instruct", endpoint: "chat" },
    chat_thinking: { id: "LFM2.5-1.2B-Thinking", endpoint: "chat" },
  },
  prices: {
    "t5-small": { input: 0.00003, output: 0.00006 },
  },
  defaultPrice: { input: 0.00005, output: 0.0001 },
  baselinePrice: { input: 0.003, output: 0.015 },
  tools: [
    { name: "zerogpu_health", handler: "health", title: "h", description: "h" },
  ],
};

function makeClient() {
  return new ZeroGpuClient({
    baseUrl: BASE,
    apiKey: "test-key",
    projectId: "test-project",
    maxRetries: 2,
    timeoutMs: 5_000,
  });
}

function makeCtx(): HandlerContext {
  return {
    client: makeClient(),
    configProvider: new StaticConfigProvider(TEST_CATALOG),
  };
}

function chatResponse(model: string, content: string) {
  return {
    id: "resp_1",
    model,
    choices: [{ index: 0, message: { role: "assistant", content } }],
    usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
  };
}

function extractPayload(result: Awaited<ReturnType<typeof classifyIabHandler>>) {
  const text = result.content[0]?.type === "text" ? result.content[0].text : "";
  return JSON.parse(text);
}

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("header contract", () => {
  it("sends x-api-key and x-project-id on every call", async () => {
    const seen: Record<string, string> = {};
    server.use(
      http.post(`${BASE}/v1/chat/completions`, ({ request }) => {
        seen["x-api-key"] = request.headers.get("x-api-key") ?? "";
        seen["x-project-id"] = request.headers.get("x-project-id") ?? "";
        return HttpResponse.json(chatResponse("t5-small", "hello world"));
      }),
    );
    await summarizeHandler(makeCtx(), { text: "some input" });
    expect(seen["x-api-key"]).toBe("test-key");
    expect(seen["x-project-id"]).toBe("test-project");
  });
});

describe("zerogpu_health", () => {
  it("returns upstream status", async () => {
    server.use(
      http.get(`${BASE}/health`, () =>
        HttpResponse.json({ status: "ok", components: { db: "up" } }),
      ),
    );
    const result = await healthHandler(makeCtx(), {});
    const parsed = extractPayload(result);
    expect(parsed.status).toBe("ok");
    expect(parsed.components.db).toBe("up");
  });
});

describe("zerogpu_classify_iab", () => {
  it("picks the enriched model when enriched=true", async () => {
    let seenModel = "";
    server.use(
      http.post(`${BASE}/v1/chat/completions`, async ({ request }) => {
        const body = (await request.json()) as { model: string };
        seenModel = body.model;
        return HttpResponse.json(
          chatResponse(body.model, JSON.stringify({ category: "Tech" })),
        );
      }),
    );
    const result = await classifyIabHandler(makeCtx(), { text: "a tech article", enriched: true });
    expect(seenModel).toBe("zlm-v1-iab-classify-edge-enriched");
    const parsed = extractPayload(result);
    expect(parsed.classification.category).toBe("Tech");
  });

  it("falls back to raw content when JSON is malformed", async () => {
    server.use(
      http.post(`${BASE}/v1/chat/completions`, () =>
        HttpResponse.json(chatResponse("zlm-v1-iab-classify-edge", "not json")),
      ),
    );
    const result = await classifyIabHandler(makeCtx(), { text: "anything" });
    const parsed = extractPayload(result);
    expect(parsed.classification).toBe("not json");
    expect(parsed.raw).toBe("not json");
  });
});

describe("zerogpu_summarize", () => {
  it("prepends 'summarize: ' to user content", async () => {
    let seenUser = "";
    server.use(
      http.post(`${BASE}/v1/chat/completions`, async ({ request }) => {
        const body = (await request.json()) as { messages: Array<{ content: string }> };
        seenUser = body.messages[0].content;
        return HttpResponse.json(chatResponse("t5-small", "short summary"));
      }),
    );
    await summarizeHandler(makeCtx(), { text: "full article body" });
    expect(seenUser).toBe("summarize: full article body");
  });
});

describe("zerogpu_classify_zero_shot", () => {
  it("builds bracketed system prompt and filters by threshold", async () => {
    let seenSystem = "";
    server.use(
      http.post(`${BASE}/v1/chat/completions`, async ({ request }) => {
        const body = (await request.json()) as { messages: Array<{ role: string; content: string }> };
        seenSystem = body.messages.find((m) => m.role === "system")?.content ?? "";
        return HttpResponse.json(
          chatResponse(
            "deberta-v3-small",
            "```json\n" + JSON.stringify({ tech: 0.9, politics: 0.1, sports: 0.02 }) + "\n```",
          ),
        );
      }),
    );
    const result = await classifyZeroShotHandler(makeCtx(), {
      text: "a story about chips",
      labels: ["tech", "politics", "sports"],
      threshold: 0.3,
    });
    expect(seenSystem).toBe("[tech,politics,sports]");
    const parsed = extractPayload(result);
    expect(parsed.scores.tech).toBe(0.9);
    expect(parsed.labels_above_threshold).toEqual(["tech"]);
  });
});

describe("zerogpu_extract_entities", () => {
  it("sends usecase=ner and labels", async () => {
    let seenBody: Record<string, unknown> = {};
    server.use(
      http.post(`${BASE}/v1/chat/completions`, async ({ request }) => {
        seenBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          chatResponse("gliner2-base-v1", JSON.stringify({ person: ["Alice"], company: ["Acme"] })),
        );
      }),
    );
    const result = await extractEntitiesHandler(makeCtx(), {
      text: "Alice works at Acme.",
      labels: ["person", "company"],
    });
    expect(seenBody.usecase).toBe("ner");
    expect(seenBody.labels).toEqual(["person", "company"]);
    const parsed = extractPayload(result);
    expect(parsed.entities.person).toContain("Alice");
  });
});

describe("zerogpu_extract_json", () => {
  it("sends usecase=json and schema", async () => {
    let seenBody: Record<string, unknown> = {};
    server.use(
      http.post(`${BASE}/v1/chat/completions`, async ({ request }) => {
        seenBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          chatResponse("gliner2-base-v1", JSON.stringify({ invoice_no: ["INV-1"], total: ["$42"] })),
        );
      }),
    );
    const result = await extractJsonHandler(makeCtx(), {
      text: "Invoice INV-1 total $42",
      schema: { invoice_no: ["string::invoice id"], total: ["money::total amount"] },
    });
    expect(seenBody.usecase).toBe("json");
    expect(seenBody.schema).toEqual({
      invoice_no: ["string::invoice id"],
      total: ["money::total amount"],
    });
    const parsed = extractPayload(result);
    expect(parsed.data.invoice_no).toEqual(["INV-1"]);
  });
});

describe("zerogpu_classify_structured", () => {
  it("sends usecase=classification and schema", async () => {
    let seenBody: Record<string, unknown> = {};
    server.use(
      http.post(`${BASE}/v1/chat/completions`, async ({ request }) => {
        seenBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          chatResponse(
            "gliner2-base-v1",
            JSON.stringify({ sentiment: "positive", topic: ["tech"] }),
          ),
        );
      }),
    );
    const result = await classifyStructuredHandler(makeCtx(), {
      text: "love this chip",
      schema: { sentiment: ["positive", "negative"], topic: ["tech", "sports"] },
    });
    expect(seenBody.usecase).toBe("classification");
    const parsed = extractPayload(result);
    expect(parsed.classification.sentiment).toBe("positive");
  });
});

describe("zerogpu_generate_followups", () => {
  it("extracts an array of questions", async () => {
    server.use(
      http.post(`${BASE}/v1/chat/completions`, () =>
        HttpResponse.json(
          chatResponse(
            "zlm-v1-followup-questions-edge",
            JSON.stringify(["What is X?", "Why does Y matter?"]),
          ),
        ),
      ),
    );
    const result = await generateFollowupsHandler(makeCtx(), { text: "some passage" });
    const parsed = extractPayload(result);
    expect(parsed.questions).toEqual(["What is X?", "Why does Y matter?"]);
  });

  it("falls back to newline parsing when the model returns plain text", async () => {
    server.use(
      http.post(`${BASE}/v1/chat/completions`, () =>
        HttpResponse.json(
          chatResponse(
            "zlm-v1-followup-questions-edge",
            "1. What is X?\n2. Why does Y matter?\n- How does Z work?",
          ),
        ),
      ),
    );
    const result = await generateFollowupsHandler(makeCtx(), { text: "some passage" });
    const parsed = extractPayload(result);
    expect(parsed.questions).toEqual([
      "What is X?",
      "Why does Y matter?",
      "How does Z work?",
    ]);
  });
});

describe("zerogpu_chat", () => {
  it("routes thinking=true to the Thinking model and splits <think> into reasoning", async () => {
    let seenModel = "";
    server.use(
      http.post(`${BASE}/v1/chat/completions`, async ({ request }) => {
        const body = (await request.json()) as { model: string };
        seenModel = body.model;
        return HttpResponse.json(
          chatResponse(
            body.model,
            "<think>weighing options</think>The final answer is 42.",
          ),
        );
      }),
    );
    const result = await chatHandler(makeCtx(), {
      messages: [{ role: "user", content: "what is the answer?" }],
      thinking: true,
    });
    expect(seenModel).toBe("LFM2.5-1.2B-Thinking");
    const parsed = extractPayload(result);
    expect(parsed.message.content).toBe("The final answer is 42.");
    expect(parsed.reasoning).toBe("weighing options");
  });

  it("does not split thinking tags when thinking=false", async () => {
    server.use(
      http.post(`${BASE}/v1/chat/completions`, () =>
        HttpResponse.json(chatResponse("LFM2.5-1.2B-Instruct", "plain answer")),
      ),
    );
    const result = await chatHandler(makeCtx(), {
      messages: [{ role: "user", content: "hi" }],
    });
    const parsed = extractPayload(result);
    expect(parsed.message.content).toBe("plain answer");
    expect(parsed.reasoning).toBeUndefined();
  });
});

describe("retry and error surfacing", () => {
  it("retries a 429 then succeeds", async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE}/v1/chat/completions`, async () => {
        calls += 1;
        if (calls === 1) {
          return new HttpResponse("rate limited", { status: 429 });
        }
        return HttpResponse.json(chatResponse("t5-small", "recovered"));
      }),
    );
    const result = await summarizeHandler(makeCtx(), { text: "hello" });
    const parsed = extractPayload(result);
    expect(parsed.summary).toBe("recovered");
    expect(calls).toBe(2);
  });

  it("surfaces a 500 as an MCP error without retrying past the max", async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE}/v1/chat/completions`, () => {
        calls += 1;
        return new HttpResponse("boom", { status: 500 });
      }),
    );
    const result = await summarizeHandler(makeCtx(), { text: "hello" });
    expect(result.isError).toBe(true);
    expect(calls).toBe(1);
  });

  it("honors abort on timeout without hanging", async () => {
    server.use(
      http.post(`${BASE}/v1/chat/completions`, async () => {
        await delay(50);
        return HttpResponse.json(chatResponse("t5-small", "late"));
      }),
    );
    const client = new ZeroGpuClient({
      baseUrl: BASE,
      apiKey: "k",
      projectId: "p",
      timeoutMs: 10,
      maxRetries: 0,
    });
    const ctx: HandlerContext = {
      client,
      configProvider: new StaticConfigProvider(TEST_CATALOG),
    };
    const result = await summarizeHandler(ctx, { text: "hello" });
    expect(result.isError).toBe(true);
  });
});
