#!/usr/bin/env python3
"""Audit the ZeroGPU Router OpenClaw plugin against the live model catalog API.

The API (https://api-dashboard.zerogpu.ai/api/models) is the source of truth for every
machine-readable fact about a model: pricing, maxTokens, task, parameters.

Reports:
  * PROSE   — a skill or README line stating a price, context window, or parameter count
              that is true of none of the models the line is about, with file:line
  * RENAME  — a model a skill calls that the API now serves under a longer id, plus every
              file to update
  * ORPHAN  — a model a skill calls that the API does not return, plus every file to clean
  * COUNT   — a skill count that disagrees with agents/openclaw/plugin/skills
  * NOTE    — an API model no skill calls (nothing to do: the sync never creates a skill)
  * SHARED  — a stale mention in a file shared with the Claude Code plugin (report, never edit)

Read-only. Every finding is prose, so it is located for the caller to edit by hand.

A line is "about" the models it names, the models of any skill it references in
backticks (`chat`, `chat-glm`), and — inside a SKILL.md — that skill's own models.
Cost ratios ("roughly 7x") are not checked; sweep for them by hand whenever a price moves.

Usage:
  python3 .claude/skills/openclaw-model-sync/scripts/audit-models.py
  python3 .claude/skills/openclaw-model-sync/scripts/audit-models.py --model glm-5.2
  python3 .claude/skills/openclaw-model-sync/scripts/audit-models.py --save models.json
  python3 .claude/skills/openclaw-model-sync/scripts/audit-models.py --json models.json   # offline
  python3 .claude/skills/openclaw-model-sync/scripts/audit-models.py --strict             # CI/loop
"""

import argparse
import json
import os
import re
import sys
import urllib.request

API_URL = "https://api-dashboard.zerogpu.ai/api/models"

PLUGIN_ROOT = "agents/openclaw"
SKILLS_DIR = "agents/openclaw/plugin/skills"
PLUGIN_README = "agents/openclaw/plugin/README.md"
READMES = [PLUGIN_README, "agents/openclaw/README.md"]
MANIFEST = "agents/openclaw/plugin/openclaw.plugin.json"
CHANGELOG = "agents/openclaw/CHANGELOG.md"
SKIP_DIRS = {"node_modules", "dist"}
# History and generated files: never scanned.
SKIP_FILES = {CHANGELOG, "agents/openclaw/plugin/package-lock.json"}
# Scanned so renames and removals are visible, never edited: the root README's Routes
# table documents the Claude Code plugin too.
SHARED = ["README.md"]

# (file, pattern) — the number counts the skills that call a model.
COUNTS = [(PLUGIN_README, re.compile(r"(\d+) task-specific skills"))]


# --------------------------------------------------------------------------- helpers


def repo_root():
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.abspath(os.path.join(here, "..", "..", "..", ".."))
    if not os.path.isdir(os.path.join(root, SKILLS_DIR)):
        root = os.getcwd()
    return root


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "zerogpu-router-audit"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def read_lines(root, rel):
    try:
        with open(os.path.join(root, rel), encoding="utf-8") as f:
            return f.read().splitlines()
    except (OSError, UnicodeDecodeError):
        return []


CALL = re.compile(
    r"zerogpu (chat_completions|moderations|embeddings)\b.*?\s-m\s+([A-Za-z0-9][\w.-]*)"
)
OPTION = re.compile(r"`-m ([A-Za-z0-9][\w.-]*)`")


def parse_skills(root):
    """{skill: {model_id: endpoint}} from each SKILL.md's command and `-m` options."""
    skills = {}
    for name in sorted(os.listdir(os.path.join(root, SKILLS_DIR))):
        lines = read_lines(root, f"{SKILLS_DIR}/{name}/SKILL.md")
        if not lines:
            continue
        models, endpoint = {}, None
        for line in lines:
            for ep, mid in CALL.findall(line):
                endpoint = endpoint or ep
                models.setdefault(mid, ep)
        for line in lines:
            for mid in OPTION.findall(line):
                models.setdefault(mid, endpoint)
        skills[name] = models
    return skills


def mentions(line, mid):
    """True when the line names this exact id — not a longer id that starts with it."""
    return re.search(r"(?<![\w.-])" + re.escape(mid) + r"(?![\w-]|\.\w)", line) is not None


def human_forms(n):
    """Ways a token count is legitimately written in prose:
    1048576 -> 1,048,576 / 1024K / 1048K / 1M;  131072 -> 131,072 / 128K / 131K."""
    forms = {f"{n:,}", str(n)}
    if n % 1_048_576 == 0:
        forms.add(f"{n // 1_048_576}M")
    if n % 1024 == 0:
        forms.add(f"{n // 1024}K")
    if n >= 1000:
        forms.add(f"{round(n / 1000)}K")
    if n >= 1_000_000:
        forms.add(f"{round(n / 1_000_000)}M")
    return forms


def money(v):
    return f"${v:.2f}" if round(v, 2) == v else f"${v:g}"


# Context-window claims only: not "per 1M tokens" prices or "78 tokens in / 41 out" usage.
TOKENS = re.compile(r"(?<!per )\b(\d[\d,]*|\d+(?:\.\d+)?[KM])[-\s](?:token|context)(?!s? (?:in|out)\b)")
PARAMS = re.compile(r"\b(\d+(?:\.\d+)?[BM])\s+(?:MoE|param)")
PARAM_CELL = re.compile(r"\d+(?:\.\d+)?[BM]")
PRICE_PAIR = re.compile(r"\\?\$(\d+(?:\.\d+)?)\s*/\s*\\?\$(\d+(?:\.\d+)?)")
PRICE_INPUT = re.compile(r"\\?\$(\d+(?:\.\d+)?) per 1M input")
SKILL_REF = re.compile(r"`([\w-]+)`")


def stale_numbers(line, facts):
    """Claims on the line that are true of none of the models it is about."""
    out = []

    def untrue(values, ok):
        return values and not any(ok(v) for v in values)

    for a, b in PRICE_PAIR.findall(line):
        pairs = [(f["in"], f["out"]) for f in facts if f["in"] is not None]
        if untrue(pairs, lambda p: abs(p[0] - float(a)) < 1e-9 and abs(p[1] - float(b)) < 1e-9):
            api = " or ".join(sorted({f"{money(i)} / {money(o)}" for i, o in pairs}))
            out.append(f"says ${a} / ${b} per 1M — API has {api}")
    for a in PRICE_INPUT.findall(PRICE_PAIR.sub("", line)):
        ins = [f["in"] for f in facts if f["in"] is not None]
        if untrue(ins, lambda v: abs(v - float(a)) < 1e-9):
            out.append(f"says ${a} per 1M input — API has {' or '.join(sorted({money(v) for v in ins}))}")
    for raw in TOKENS.findall(line):
        raw = raw.rstrip(",")
        windows = [f["maxTokens"] for f in facts if f["maxTokens"]]
        if untrue(windows, lambda n: raw in human_forms(n)):
            api = " or ".join(f"{n:,}" for n in sorted(set(windows)))
            out.append(f"says '{raw}' tokens — API maxTokens is {api}")
    cells = [c.strip() for c in line.strip().strip("|").split("|")] if line.lstrip().startswith("|") else []
    for raw in PARAMS.findall(line) + [c for c in cells if PARAM_CELL.fullmatch(c)]:
        params = [f["params"] for f in facts if f["params"]]
        if untrue(params, lambda p: p == raw.upper()):
            out.append(f"says '{raw}' parameters — API says {' or '.join(sorted(set(params)))}")
    return out


def plugin_files(root):
    """Every plugin source file a model id can appear in — no history, build output, or deps."""
    out = []
    for dirpath, dirnames, filenames in os.walk(os.path.join(root, PLUGIN_ROOT)):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
        for fn in sorted(filenames):
            rel = os.path.relpath(os.path.join(dirpath, fn), root)
            if fn.endswith((".md", ".json", ".ts")) and rel not in SKIP_FILES:
                out.append(rel)
    return out


def skill_of(rel):
    m = re.fullmatch(re.escape(SKILLS_DIR) + r"/([\w-]+)/SKILL\.md", rel)
    return m.group(1) if m else None


def locations(root, mid, skills, rename):
    hits = []
    for rel in plugin_files(root):
        count = sum(1 for line in read_lines(root, rel) if mentions(line, mid))
        if not count:
            continue
        skill = skill_of(rel)
        if skill and mid in skills.get(skill, {}):
            if rename:
                note = "(replace the model in the command, the description, and the body)"
            elif len(skills[skill]) == 1:
                note = "(delete this skill — it has no other model)"
            else:
                note = "(drop this model option; the skill keeps its other model)"
        elif rel in READMES:
            note = (
                "(replace every mention: table rows, examples)"
                if rename
                else "(strip its table row or model option, its Data & privacy mention, and every mention)"
            )
        else:
            note = "(replace the mention)" if rename else "(rewrite or delete the mention)"
        hits.append(f"{'REPLACE' if rename else 'REMOVE'}: {rel} ({count} line{'s' if count != 1 else ''})  {note}")
    if not rename:
        for skill, calls in skills.items():
            if list(calls) == [mid]:
                hits.append(f"REMOVE: {MANIFEST}  (drop \"./skills/{skill}\" from skills)")
    for rel in SHARED:
        lines = [n + 1 for n, line in enumerate(read_lines(root, rel)) if mentions(line, mid)]
        if lines:
            hits.append(
                f"SHARED: {rel}:{', '.join(map(str, lines))}  "
                "(shared with the Claude Code plugin — leave it; list it in the PR body)"
            )
    return hits


# --------------------------------------------------------------------------- main


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", help="read the model list from this file instead of the API")
    ap.add_argument("--save", help="write the fetched payload here")
    ap.add_argument("--model", action="append", help="limit the report to these model ids")
    ap.add_argument("--strict", action="store_true", help="exit 1 when anything is reported")
    args = ap.parse_args()

    root = repo_root()

    if args.json:
        with open(args.json, encoding="utf-8") as f:
            payload = json.load(f)
    else:
        payload = fetch(API_URL)
    if args.save:
        with open(args.save, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)

    models = payload.get("models") or []
    if not models:
        print("ERROR: the API returned no models — do not touch the plugin.", file=sys.stderr)
        return 2

    api = {m["modelId"]: m for m in models}
    skills = parse_skills(root)
    plugin_ids = {mid for calls in skills.values() for mid in calls}

    successors = {}
    for oid in sorted(plugin_ids - set(api)):
        cands = [a for a in api if a.startswith(oid + "-") and a not in plugin_ids]
        successors[oid] = cands[0] if len(cands) == 1 else None

    def facts(mid):
        m = api.get(mid) or api.get(successors.get(mid) or "")
        if not m:
            return None
        p = m.get("pricing") or {}
        return {
            "in": p.get("input_per_1m_tokens"),
            "out": p.get("output_per_1m_tokens"),
            "maxTokens": m.get("maxTokens"),
            "params": str(m.get("parameters") or "").replace(" ", "").upper() or None,
        }

    known_ids = set(api) | plugin_ids
    wanted = set(args.model or [])

    print(f"API: {len(models)} models — {', '.join(api)}")
    print(f"Plugin: {len(skills)} skills calling {len(plugin_ids)} models — {', '.join(sorted(plugin_ids))}\n")

    findings = 0

    # --- prose: stale numbers in skills and the READMEs ------------------------------
    prose = []
    for rel in [f"{SKILLS_DIR}/{s}/SKILL.md" for s in skills] + READMES:
        own = skill_of(rel)
        for n, line in enumerate(read_lines(root, rel)):
            about = {mid for mid in known_ids if mentions(line, mid)}
            if own:
                about |= set(skills[own])
            for ref in SKILL_REF.findall(line):
                about |= set(skills.get(ref, {}))
            if wanted and not (about & wanted or {successors.get(w) for w in about} & wanted):
                continue
            fs = [f for f in map(facts, sorted(about)) if f]
            for claim in stale_numbers(line, fs):
                prose.append(f"PROSE: {rel}:{n + 1}: {claim}: {line.strip()[:120]}")
    prose = list(dict.fromkeys(prose))
    for p in prose:
        print(p)
    findings += len(prose)
    if prose:
        print()

    # --- renames and removals -------------------------------------------------------
    for oid, new in successors.items():
        if wanted and oid not in wanted and new not in wanted:
            continue
        users = ", ".join(s for s, calls in skills.items() if oid in calls)
        if new:
            print(f"RENAME: {oid} -> {new} — the API serves it under the new id (skills: {users}).")
        else:
            print(f"ORPHAN: {oid} is called by the plugin but the API does not return it (skills: {users}).")
        for loc in locations(root, oid, skills, bool(new)):
            print(f"   {loc}")
        print()
        findings += 1

    # --- skill counts -----------------------------------------------------------------
    if not wanted:
        inference = sum(1 for calls in skills.values() if calls)
        for rel, pattern in COUNTS:
            for n, line in enumerate(read_lines(root, rel)):
                for raw in pattern.findall(line):
                    if int(raw) != inference:
                        print(f"COUNT: {rel}:{n + 1}: says {raw} task-specific skills — {inference} skills call a model")
                        findings += 1

    # --- API models no skill calls ----------------------------------------------------
    called = plugin_ids | {s for s in successors.values() if s}
    for mid, m in api.items():
        if mid not in called and (not wanted or mid in wanted):
            print(f"NOTE: {mid} ({m.get('taskDisplayName') or '?'}) — no skill calls it")

    print(f"\n{findings} finding(s).")
    return 1 if (args.strict and findings) else 0


if __name__ == "__main__":
    sys.exit(main())
