import type { ChatCompletionsUsage } from "./zerogpuClient.js";

export const PRICE_TABLE_VERSION = "2026-04-22";

// USD per 1K tokens. Placeholders — operator should tune for their contract.
interface PriceEntry {
  input: number;
  output: number;
}

const ZEROGPU_PRICES: Record<string, PriceEntry> = {
  "zlm-v1-iab-classify-edge": { input: 0.00002, output: 0.00004 },
  "zlm-v1-iab-classify-edge-enriched": { input: 0.00002, output: 0.00004 },
  "zlm-v1-followup-questions-edge": { input: 0.00002, output: 0.00004 },
  "t5-small": { input: 0.00003, output: 0.00006 },
  "deberta-v3-small": { input: 0.00003, output: 0.00006 },
  "gliner2-base-v1": { input: 0.00003, output: 0.00006 },
  "LFM2.5-1.2B-Instruct": { input: 0.00005, output: 0.0001 },
  "LFM2.5-1.2B-Thinking": { input: 0.00005, output: 0.0001 },
};

const DEFAULT_ZEROGPU_PRICE: PriceEntry = { input: 0.00005, output: 0.0001 };
// Nominal large-LLM baseline for savings comparison (e.g. GPT-4-class).
const BASELINE_PRICE: PriceEntry = { input: 0.003, output: 0.015 };

export interface SavingsSummary {
  input_tokens: number;
  output_tokens: number;
  zerogpu_cost_usd: number;
  baseline_cost_usd: number;
  savings_usd: number;
  price_table_version: string;
}

export interface SavingsLogEntry extends SavingsSummary {
  tool: string;
  model: string;
  latency_ms: number;
}

function costOf(tokens: number, perK: number): number {
  return (tokens / 1000) * perK;
}

export function computeSavings(model: string, usage: ChatCompletionsUsage | undefined): SavingsSummary {
  const inputTokens = Number(usage?.prompt_tokens ?? 0);
  const outputTokens = Number(usage?.completion_tokens ?? 0);
  const price = ZEROGPU_PRICES[model] ?? DEFAULT_ZEROGPU_PRICE;

  const zerogpuCost = costOf(inputTokens, price.input) + costOf(outputTokens, price.output);
  const baselineCost = costOf(inputTokens, BASELINE_PRICE.input) + costOf(outputTokens, BASELINE_PRICE.output);

  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    zerogpu_cost_usd: round(zerogpuCost),
    baseline_cost_usd: round(baselineCost),
    savings_usd: round(baselineCost - zerogpuCost),
    price_table_version: PRICE_TABLE_VERSION,
  };
}

export function logSavings(entry: SavingsLogEntry): void {
  const line = JSON.stringify({ kind: "zerogpu.savings", ...entry });
  try {
    const proc = (globalThis as { process?: { stderr?: { write?: (s: string) => unknown } } }).process;
    if (proc?.stderr?.write) {
      proc.stderr.write(`${line}\n`);
      return;
    }
  } catch {
    // fall through to console
  }
  try {
    // Cloudflare Workers and browsers: goes to the platform log stream.
    // eslint-disable-next-line no-console
    console.log(line);
  } catch {
    // logging must never fail a tool call.
  }
}

function round(value: number): number {
  return Math.round(value * 1e8) / 1e8;
}
