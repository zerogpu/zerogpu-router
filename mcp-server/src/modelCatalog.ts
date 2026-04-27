/**
 * @fileoverview Task type definitions for model routing.
 *
 * This file defines the names of all tasks that tools can execute.
 * Each task maps to a specific model in the backend (configured in KV or file).
 * Tools call runChat() with a task name, and the config system looks up which model to use.
 *
 * Re-exports: This file also re-exports model configuration helpers from config.js
 * for convenience (so callers import from one place).
 */

/** Task names that can be routed to models. */
export type Task =
  | "classify_iab"           // Standard IAB topic classification
  | "classify_iab_enriched"  // IAB classification with richer taxonomy
  | "summarize"              // Text summarization
  | "classify_zero_shot"     // Zero-shot classification (user-provided labels)
  | "extract_entities"       // Named Entity Recognition
  | "extract_json"           // Structured JSON extraction
  | "classify_structured"    // Multi-axis classification
  | "generate_followups"     // Follow-up question generation
  | "chat"                   // General-purpose chat
  | "chat_thinking";         // Chat with explicit reasoning

// Re-export model configuration types and helpers for convenience
export type { Endpoint, ModelRef } from "./config.js";
export { getModel } from "./config.js";
