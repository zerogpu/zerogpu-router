/**
 * Live parity tests — gated by ZEROGPU_LIVE=1.
 * Mirrors the key assertions from the Postman collection against a real sandbox project.
 * Do NOT run in CI without credentials configured for a non-production project.
 */
import { describe, expect, it } from "vitest";

import { ZeroGpuClient } from "../src/zerogpuClient.js";
import { classifyIabHandler } from "../src/tools/classifyIab.js";
import { summarizeHandler } from "../src/tools/summarize.js";
import { classifyZeroShotHandler } from "../src/tools/classifyZeroShot.js";
import { extractEntitiesHandler } from "../src/tools/extractEntities.js";
import { extractJsonHandler } from "../src/tools/extractJson.js";
import { classifyStructuredHandler } from "../src/tools/classifyStructured.js";
import { generateFollowupsHandler } from "../src/tools/generateFollowups.js";
import { chatHandler } from "../src/tools/chat.js";
import { healthHandler } from "../src/tools/health.js";

const LIVE = process.env.ZEROGPU_LIVE === "1";
const suite = LIVE ? describe : describe.skip;

function parse<T = unknown>(result: { content: Array<{ type: string; text: string }>; isError?: boolean }): T {
  expect(result.isError).toBeFalsy();
  return JSON.parse(result.content[0].text) as T;
}

function buildClient(): ZeroGpuClient {
  const baseUrl = process.env.ZEROGPU_ORCHESTRATION_URL;
  const apiKey = process.env.ZEROGPU_API_KEY;
  const projectId = process.env.ZEROGPU_PROJECT_ID;
  if (!baseUrl || !apiKey || !projectId) {
    throw new Error(
      "Live tests require ZEROGPU_ORCHESTRATION_URL, ZEROGPU_API_KEY, and ZEROGPU_PROJECT_ID.",
    );
  }
  return new ZeroGpuClient({ baseUrl, apiKey, projectId });
}

suite("ZeroGPU live parity", () => {
  const client = LIVE ? buildClient() : (undefined as unknown as ZeroGpuClient);

  it("health is reachable", async () => {
    const result = await healthHandler(client, {});
    const payload = parse<{ status: string }>(result);
    expect(payload.status).toBeTruthy();
  });

  it("IAB edge classifier returns a classification", async () => {
    const result = await classifyIabHandler(client, {
      text: "The new iPhone 17 was announced with a faster neural engine.",
    });
    const payload = parse<{ classification: unknown; usage: { total_tokens?: number } }>(result);
    expect(payload.classification).toBeTruthy();
    expect(typeof payload.usage?.total_tokens).toBe("number");
  });

  it("t5-small summarizes", async () => {
    const result = await summarizeHandler(client, {
      text:
        "Large language models are neural networks trained on massive text corpora. They can generate, classify, and extract information from natural language.",
    });
    const payload = parse<{ summary: string }>(result);
    expect(payload.summary.length).toBeGreaterThan(0);
  });

  it("deberta zero-shot returns scores", async () => {
    const result = await classifyZeroShotHandler(client, {
      text: "The presidential debate focused on economic policy.",
      labels: ["politics", "sports", "technology"],
    });
    const payload = parse<{ scores: Record<string, number> }>(result);
    const entries = Object.entries(payload.scores);
    expect(entries.length).toBeGreaterThan(0);
    for (const [, value] of entries) expect(typeof value).toBe("number");
  });

  it("gliner NER extracts entities", async () => {
    const result = await extractEntitiesHandler(client, {
      text: "Alice works at Acme in Berlin since 2021.",
      labels: ["person", "company", "location", "date"],
    });
    const payload = parse<{ entities: Record<string, unknown> }>(result);
    expect(payload.entities).toBeTruthy();
  });

  it("gliner JSON extraction returns structured fields", async () => {
    const result = await extractJsonHandler(client, {
      text: "Invoice INV-92 total is $1,240 due 2026-05-01.",
      schema: {
        invoice_no: ["string::invoice identifier"],
        total: ["money::total amount"],
        due_date: ["date::due date"],
      },
    });
    const payload = parse<{ data: Record<string, unknown> }>(result);
    expect(payload.data).toBeTruthy();
  });

  it("gliner classification honors schema", async () => {
    const result = await classifyStructuredHandler(client, {
      text: "I absolutely love the new chip design.",
      schema: { sentiment: ["positive", "negative", "neutral"], topic: ["tech", "sports", "politics"] },
    });
    const payload = parse<{ classification: Record<string, unknown> }>(result);
    expect(payload.classification).toBeTruthy();
  });

  it("follow-up edge model produces questions", async () => {
    const result = await generateFollowupsHandler(client, {
      text: "Our team shipped a new retrieval layer that uses small embedding models at the edge.",
    });
    const payload = parse<{ questions: string[] }>(result);
    expect(Array.isArray(payload.questions)).toBe(true);
  });

  it("LFM chat responds", async () => {
    const result = await chatHandler(client, {
      messages: [{ role: "user", content: "Say hello in one short sentence." }],
    });
    const payload = parse<{ message: { content: string } }>(result);
    expect(payload.message.content.length).toBeGreaterThan(0);
  });

  it("LFM thinking emits <think> traces that we split out", async () => {
    const result = await chatHandler(client, {
      messages: [{ role: "user", content: "What is 7 * 8? Show your work." }],
      thinking: true,
    });
    const payload = parse<{ message: { content: string }; reasoning?: string }>(result);
    expect(payload.message.content.length).toBeGreaterThan(0);
    expect(payload.message.content).not.toContain("<think>");
  });
});
