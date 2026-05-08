/**
 * @fileoverview Zero-shot classification tool.
 *
 * Classifies text against arbitrary user-provided labels without requiring training data.
 * Returns confidence scores for each label and a filtered list of labels above a threshold.
 *
 * Zero-shot means: the model has never seen these specific labels before, but can still
 * classify based on semantic understanding of the text and label meanings.
 */

import { z } from "zod";
import { mcpError, mcpJson, runChat, safeJsonParse, type HandlerContext } from "./shared.js";

/** Input schema: text, list of labels (2+), optional threshold. */
export const classifyZeroShotArgs = z
  .object({
    text: z.string().min(1, "text must not be empty"),
    labels: z.array(z.string().min(1)).min(2, "at least two labels required"),
    threshold: z.number().min(0).max(1).optional(), // Confidence threshold (0-1)
  })
  .strict();

export type ClassifyZeroShotArgs = z.infer<typeof classifyZeroShotArgs>;

/**
 * Zero-shot classification handler.
 *
 * Process:
 * 1. Build a system prompt with the label list (model expects labels in square brackets)
 * 2. Call runChat with the text and system prompt
 * 3. Parse the response as JSON { label: score, ... }
 * 4. Filter results by threshold (default 0.5) and return labels above it
 * 5. Return both raw scores and filtered labels for user flexibility
 *
 * Why system prompt: The backend model expects labels to be specified in the system prompt,
 * not mixed into the user message. This is the contract for this particular model.
 *
 * Why threshold filtering: Users often want only "confident" predictions. Default 0.5
 * is conservative but can be overridden. Unfiltered scores are also returned for transparency.
 *
 * @param ctx Handler context
 * @param args Text, label list, and optional threshold
 * @returns Scores dict, filtered labels, threshold value, and cost info
 */
export async function classifyZeroShotHandler(ctx: HandlerContext, args: ClassifyZeroShotArgs) {
  try {
    // Format labels as system prompt: "[label1,label2,label3]"
    const systemPrompt = `[${args.labels.join(",")}]`;

    const result = await runChat(ctx, {
      task: "classify_zero_shot",
      toolName: "zerogpu_classify_zero_shot",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: args.text },
      ],
    });

    // Parse the response (expect { "label1": 0.9, "label2": 0.1, ... })
    const parsed = safeJsonParse<Record<string, number>>(result.content);
    const scores = parsed.ok && parsed.parsed ? parsed.parsed : {};

    // Filter labels by threshold
    const threshold = args.threshold ?? 0.5;
    const labelsAbove = Object.entries(scores)
      .filter(([, score]) => typeof score === "number" && score >= threshold)
      .map(([label]) => label);

    return mcpJson({
      scores,                        // All scores for transparency
      labels_above_threshold: labelsAbove, // Convenient filtered list
      threshold,                     // Echo back the threshold used
      model: result.model,
      usage: result.usage,
      savings: result.savings,
      raw: parsed.ok ? undefined : result.content, // Include raw if parsing failed
    });
  } catch (err) {
    return mcpError((err as Error).message, { tool: "zerogpu_classify_zero_shot" });
  }
}
