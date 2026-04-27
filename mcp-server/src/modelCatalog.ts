export type Task =
  | "classify_iab"
  | "classify_iab_enriched"
  | "summarize"
  | "classify_zero_shot"
  | "extract_entities"
  | "extract_json"
  | "classify_structured"
  | "generate_followups"
  | "chat"
  | "chat_thinking";

export type { Endpoint, ModelRef } from "./config.js";
export { getModel } from "./config.js";
