import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

// Annotate with the helper's own return type so the emitted .d.ts references the
// public `definePluginEntry` import rather than an internal SDK type module (TS2742).
const entry: ReturnType<typeof definePluginEntry> = definePluginEntry({
  id: "zerogpu-router",
  name: "ZeroGPU Router",
  description: "Route trivial AI tasks to ZeroGPU small/nano models via ZeroGPU CLI.",
  register() {
    // Skills load declaratively from openclaw.plugin.json#skills.
    // Each skill invokes the ZeroGPU CLI directly via Bash tools.
  },
});

export default entry;
