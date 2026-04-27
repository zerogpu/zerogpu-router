#!/usr/bin/env node
// Publishes config/catalog.json to the ZEROGPU_CONFIG KV namespace under key `catalog`.
// Reads from config/catalog.json (single source of truth) and runs
// `wrangler kv key put` against the requested environment.
//
// Usage:
//   node scripts/seed-kv.mjs --env develop
//   node scripts/seed-kv.mjs --env staging --path config/catalog.json
//   node scripts/seed-kv.mjs --env production
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(here, "..");

function parseArgs(argv) {
  const args = { env: null, path: resolve(packageDir, "config", "catalog.json"), binding: "ZEROGPU_CONFIG", key: "catalog", preview: false, remote: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--env" || a === "-e") args.env = argv[++i];
    else if (a === "--path" || a === "-p") args.path = resolve(argv[++i]);
    else if (a === "--binding" || a === "-b") args.binding = argv[++i];
    else if (a === "--key" || a === "-k") args.key = argv[++i];
    else if (a === "--preview") args.preview = true;
    else if (a === "--local") args.remote = false;
    else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`unknown arg: ${a}`);
      printHelp();
      process.exit(2);
    }
  }
  return args;
}

function printHelp() {
  console.log(`seed-kv — publish config/catalog.json to Cloudflare KV

Options:
  --env, -e <name>     wrangler env (local|develop|staging|production). Required unless --local.
  --path, -p <path>    config json path (default: config/catalog.json)
  --binding, -b <name> KV binding name (default: ZEROGPU_CONFIG)
  --key, -k <name>     KV key to write (default: catalog)
  --preview            write to the preview namespace instead of production
  --local              write to the local (wrangler dev) KV store
`);
}

function validate(raw) {
  if (!raw || typeof raw !== "object") throw new Error("catalog root must be an object");
  const required = ["version", "priceTableVersion", "models", "prices", "defaultPrice", "baselinePrice", "tools"];
  for (const key of required) {
    if (!(key in raw)) throw new Error(`catalog missing required field: ${key}`);
  }
  if (!Array.isArray(raw.tools) || raw.tools.length === 0) throw new Error("catalog.tools must be a non-empty array");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.env && args.remote) {
    console.error("--env is required (use --local for local dev KV)");
    printHelp();
    process.exit(2);
  }

  let raw;
  try {
    const contents = readFileSync(args.path, "utf8");
    raw = JSON.parse(contents);
  } catch (err) {
    console.error(`failed to read/parse ${args.path}: ${err.message}`);
    process.exit(1);
  }
  validate(raw);

  const wranglerArgs = ["wrangler", "kv", "key", "put", args.key, JSON.stringify(raw), "--binding", args.binding];
  if (args.env && args.env !== "local") wranglerArgs.push("--env", args.env);


  console.log(`> npx ${wranglerArgs.join(" ")}`);
  const result = spawnSync("npx", wranglerArgs, {
    stdio: "inherit",
    cwd: packageDir,
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  console.log(`published catalog v${raw.version} to ${args.env ?? "local"} (key=${args.key})`);
}

main();
