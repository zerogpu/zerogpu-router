/**
 * @fileoverview Cost tracking and savings calculation for ZeroGPU tools.
 *
 * Compares the cost of running a task on ZeroGPU (small/nano models) against
 * a baseline cost (typical Claude model), then logs the savings for analytics.
 *
 * Every tool execution emits a savings log entry. Claude Code and external tools
 * can aggregate these to show users:
 * - How much each tool costs to run
 * - How much money ZeroGPU saves vs. Claude for that task
 * - Cumulative savings over time
 */

import type { PriceEntry, ZeroGpuConfig } from "./config.js";
import type { ChatCompletionsUsage } from "./zerogpuClient.js";

/**
 * Cost breakdown for a single tool execution.
 * Captures both the ZeroGPU cost and the baseline (Claude) cost for comparison.
 */
export interface SavingsSummary {
  input_tokens: number;      // Tokens consumed by the prompt
  output_tokens: number;     // Tokens generated in the response
  zerogpu_cost_usd: number;  // Cost of this execution on ZeroGPU (USD)
  baseline_cost_usd: number; // Estimated cost if Claude had done this task (USD)
  savings_usd: number;       // baselineCost - zerogpuCost (always ≥ 0)
  price_table_version: string; // Date of the price table used (for auditing)
}

/**
 * Complete savings log entry with tool and latency information.
 * Emitted to stderr (Node) or console (Workers) after every tool execution.
 *
 * Format: JSON lines, one entry per line, suitable for streaming to a log aggregator.
 */
export interface SavingsLogEntry extends SavingsSummary {
  tool: string;         // Tool name (e.g., "zerogpu_summarize")
  model: string;        // Model ID that executed the task (e.g., "t5-small")
  latency_ms: number;   // End-to-end latency of the tool call (including retry, backoff)
}

/**
 * Computes the USD cost of a quantity of tokens at a per-thousand rate.
 *
 * Formula: (tokens / 1000) * perK
 *
 * Example: 1000 tokens at $0.10 per 1K = $0.10
 *
 * Why a helper: Token costs are specified as "per 1K tokens" (like "0.0005 per 1K").
 * This function handles the scaling consistently.
 *
 * @param tokens Number of tokens
 * @param perK Cost per 1000 tokens (USD)
 * @returns Cost in USD
 */
function costOf(tokens: number, perK: number): number {
  return (tokens / 1000) * perK;
}

/**
 * Rounds a small USD amount to 8 decimal places.
 *
 * Why 8 decimals: Token costs are fractional cents. This precision captures
 * the full value without floating-point rounding errors while being human-readable.
 * Example: 0.000001 (one millionth of a dollar) is meaningful.
 *
 * Implementation: Multiply by 1e8 (move decimal 8 places right), round to nearest int,
 * then divide by 1e8 (move decimal back). This avoids floating-point precision issues
 * that would arise from rounding directly.
 *
 * @param value Raw USD amount (may have many decimal places from division)
 * @returns Rounded to 8 decimal places
 */
function round(value: number): number {
  return Math.round(value * 1e8) / 1e8;
}

/**
 * Computes the savings for a tool execution by comparing ZeroGPU cost to a baseline.
 *
 * Process:
 * 1. Extract token counts from the response (default to 0 if missing)
 * 2. Look up per-token prices: uses model-specific pricing if available, else default
 * 3. Calculate ZeroGPU cost: (input_tokens / 1K) * zerogpu_price.input + (output_tokens / 1K) * zerogpu_price.output
 * 4. Calculate baseline cost: same formula but with baseline (Claude) prices
 * 5. Compute savings: baseline_cost - zerogpu_cost
 * 6. Round all costs to 8 decimal places and return
 *
 * Why fallback to defaultPrice: New models may not have explicit pricing. Falling back
 * to a default is better than erroring out; the savings estimate will be slightly off
 * but the tool still works.
 *
 * Why baseline comparison: Shows users the value of ZeroGPU. "This costs $0.001" is
 * meaningless without context; "This costs $0.001 instead of $0.10" clearly demonstrates
 * the benefit.
 *
 * @param config Configuration with price table (model prices and baseline)
 * @param model Model ID that executed the task (used to look up pricing)
 * @param usage Token counts from the response
 * @returns SavingsSummary with costs and savings
 */
export function computeSavings(
  config: ZeroGpuConfig,
  model: string,
  usage: ChatCompletionsUsage | undefined,
): SavingsSummary {
  // Extract token counts, defaulting to 0 if not provided
  const inputTokens = Number(usage?.prompt_tokens ?? 0);
  const outputTokens = Number(usage?.completion_tokens ?? 0);

  // Look up pricing for this specific model, or fall back to default
  const price: PriceEntry = config.prices[model] ?? config.defaultPrice;
  const baseline = config.baselinePrice;

  // Compute costs for both ZeroGPU and baseline (Claude)
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

/**
 * Logs a savings entry to stderr (Node) or console (Workers).
 *
 * Emits a single JSON line with kind="zerogpu.savings" and all cost/latency data.
 * This is the observability hook for the tool: every execution is logged.
 *
 * Resilience: Never throws, even if logging fails. Broken logging should not
 * break a tool call. Tries multiple approaches:
 * 1. Try process.stderr.write (Node.js)
 * 2. Fall through to console.log (Cloudflare Workers, browsers)
 * 3. Silently fail if both are unavailable
 *
 * Why: Different runtimes (Node, Cloudflare Workers, browser environments) have
 * different logging APIs. This tries both with graceful fallback.
 *
 * @param entry Complete savings log entry (tool, model, costs, latency)
 */
export function logSavings(entry: SavingsLogEntry): void {
  const line = JSON.stringify({ kind: "zerogpu.savings", ...entry });

  try {
    // Try Node.js process.stderr API
    const proc = (globalThis as { process?: { stderr?: { write?: (s: string) => unknown } } }).process;
    if (proc?.stderr?.write) {
      proc.stderr.write(`${line}\n`);
      return;
    }
  } catch {
    // Fall through if process API doesn't exist or threw
  }

  try {
    // Fallback: console.log for Cloudflare Workers and other runtimes
    // eslint-disable-next-line no-console
    console.log(line);
  } catch {
    // Even console.log failed: silently ignore
    // Logging must never fail a tool call
  }
}
