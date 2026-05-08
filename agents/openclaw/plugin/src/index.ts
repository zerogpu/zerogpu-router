import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "zerogpu-router",
  name: "ZeroGPU Router",
  description: "Route trivial AI tasks to ZeroGPU small/nano models via MCP.",
  register() {
    // Skills load declaratively from openclaw.plugin.json#skills.
    // The remote MCP server is registered separately via `openclaw mcp set zerogpu …`.
  },
});
