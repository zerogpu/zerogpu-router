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

export type Endpoint = "chat" | "responses";

export interface ModelRef {
  id: string;
  endpoint: Endpoint;
}

const CATALOG: Record<Task, ModelRef> = {
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
};

export function getModel(task: Task): ModelRef {
  const model = CATALOG[task];
  if (!model) throw new Error(`Unknown task: ${task}`);
  return model;
}

export function listModels(): Record<Task, ModelRef> {
  return { ...CATALOG };
}
