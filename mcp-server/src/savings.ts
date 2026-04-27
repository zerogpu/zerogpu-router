import type { PriceEntry, ZeroGpuConfig } from "./config.js";
import type { ChatCompletionsUsage } from "./zerogpuClient.js";

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

function round(value: number): number {
  return Math.round(value * 1e8) / 1e8;
}

export function computeSavings(
  config: ZeroGpuConfig,
  model: string,
  usage: ChatCompletionsUsage | undefined,
): SavingsSummary {
  const inputTokens = Number(usage?.prompt_tokens ?? 0);
  const outputTokens = Number(usage?.completion_tokens ?? 0);
  const price: PriceEntry = config.prices[model] ?? config.defaultPrice;
  const baseline = config.baselinePrice;

  const zerogpuCost = costOf(inputTokens, price.input) + costOf(outputTokens, price.output);
  const baselineCost = costOf(inputTokens, baseline.input) + costOf(outputTokens, baseline.output);

  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    zerogpu_cost_usd: round(zerogpuCost),
    baseline_cost_usd: round(baselineCost),
    savings_usd: round(baselineCost - zerogpuCost),
    price_table_version: config.priceTableVersion,
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
    // fall through
  }
  try {
    // eslint-disable-next-line no-console
    console.log(line);
  } catch {
    // logging must never fail a tool call
  }
}
