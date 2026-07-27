---
name: classify-domain
description: Classify a domain name against the IAB taxonomy without fetching the page (zlm-v1-iab-domain-classifier). Use when the user has a hostname or URL rather than article text — bidstream enrichment, allow/deny-list scoring, "what is example.com about?".
argument-hint: "<domain>"
allowed-tools: Bash(zerogpu classify_domain*)
---

Classify a domain:

```!
zerogpu classify_domain "$ARGUMENTS"
```

**Format `$ARGUMENTS` as a bare hostname.** The model takes only the domain — strip the scheme, path, query, and fragment first. `https://www.nytimes.com/section/world?x=1` becomes `www.nytimes.com`. If the user gave you several domains, run the command once per domain.

Output is a JSON object with `audience` (IAB 2.2 audience tiers with scores) and `content` (`iab_1_0` and `iab_2_2` category lists).

Use this instead of `/zerogpu-router:classify-iab` when the input is a domain — it needs only the hostname, so payloads are up to 10x smaller than sending page text. If the user has the actual article text and wants per-URL precision, use `classify-iab` or `classify-iab-enriched`.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.
