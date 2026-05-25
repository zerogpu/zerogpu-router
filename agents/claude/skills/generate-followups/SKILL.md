---
name: generate-followups
description: Generate contextual follow-up questions for a passage or conversation turn (zlm-v1-followup-questions-edge). Use when the user wants suggested next questions, prompts to explore further, or interview-style follow-ups for a given passage.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu generate_followups*)
---

Generate follow-up questions:

```!
zerogpu generate_followups $ARGUMENTS
```

Pass the source passage as a single quoted argument. Output is a JSON array of question strings.
