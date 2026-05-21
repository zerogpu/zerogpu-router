---
description: Route entity or JSON extraction through ZeroGPU instead of Claude
argument-hint: <text to extract from>
---

Extract structured data from the text below using the most appropriate ZeroGPU MCP tool (`zerogpu_extract_entities` for named entities, or `zerogpu_extract_json` when a schema is implied). Return the structured result.

Text:
$ARGUMENTS
