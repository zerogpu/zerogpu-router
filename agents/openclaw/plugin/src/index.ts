import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "zerogpu-router",
  name: "ZeroGPU Router",
  description: "Route trivial AI tasks to ZeroGPU small/nano models via ZeroGPU CLI.",
  register() {
    // Skills load declaratively from openclaw.plugin.json#skills.
    // Each skill invokes the ZeroGPU CLI directly via Bash tools.
  },
});
