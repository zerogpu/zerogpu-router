import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "zerogpu",
  name: "ZeroGPU",
  description: "Offload cheap AI tasks to the ZeroGPU MCP server.",
  register() {
    // Skills load declaratively from openclaw.plugin.json#skills.
    // The remote MCP server is registered separately via `openclaw mcp set zerogpu …`.
  },
});
