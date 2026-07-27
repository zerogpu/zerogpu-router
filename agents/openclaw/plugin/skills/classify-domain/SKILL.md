---
name: classify-domain
description: Classify a domain name against the IAB taxonomy without fetching the page (zlm-v1-iab-domain-classifier). Use when the user has a hostname or URL rather than article text — bidstream enrichment, allow/deny-list scoring, "what is example.com about?".
argument-hint: "<domain-or-url>"
allowed-tools: Bash(node -e *)
metadata:
  openclaw:
    requires:
      bins: [zerogpu, node]
    install:
      - kind: node
        package: zerogpu-cli
        bins: [zerogpu]
---

> **Sends your input to ZeroGPU's hosted API** for inference — this is not local processing. Don't pass secrets, credentials, or regulated data you aren't cleared to share with a third party. See the plugin README's "Data & privacy" section.

Classify a domain. `$ARGUMENTS` is the domain or URL — pass it verbatim. Full URLs are normalized down to the hostname, so `https://www.nytimes.com/section/world?x=1` works as well as `nytimes.com`:

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
export ZGPU_TEXT
node -e 'const fs=require("fs"),os=require("os"),path=require("path");let key=process.env.ZEROGPU_API_KEY;try{key=JSON.parse(fs.readFileSync(path.join(os.homedir(),".zerogpu","config.json"),"utf8")).apiKey||key}catch(e){}if(!key){console.error("Not signed in to ZeroGPU. Run: zerogpu login");process.exit(1)}const dom=(process.env.ZGPU_TEXT||"").trim().replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//,"").split(/[\/?#]/)[0].toLowerCase();if(!dom){console.error("No domain supplied.");process.exit(1)}fetch("https://api.zerogpu.ai/v1/responses",{method:"POST",headers:{"content-type":"application/json","x-api-key":key},body:JSON.stringify({model:"zlm-v1-iab-domain-classifier",input:dom})}).then(async r=>{if(!r.ok){console.error("Request failed with status "+r.status+".");console.error(await r.text());process.exit(1)}return r.json()}).then(d=>{const m=(d.output||[]).find(o=>o.type==="message");const t=m&&(m.content||[]).find(c=>c.type==="output_text");if(!t){console.log(JSON.stringify(d,null,2));return}try{console.log(JSON.stringify(JSON.parse(t.text),null,2))}catch(e){console.log(t.text)}}).catch(e=>{console.error("Request failed: "+e.message);process.exit(1)})'
```

Output is a JSON object with `audience` (IAB 2.2 audience tiers with scores) and `content` (`iab_1_0` and `iab_2_2` category lists).

Use this instead of the `classify-iab` skill when the input is a domain — it needs only the hostname, so payloads are up to 10x smaller than sending page text. If the user has actual article text, use `classify-iab` or `classify-iab-enriched`.

This skill calls the ZeroGPU API directly rather than through the `zerogpu` CLI, which has no command for this model. It still uses the credentials `zerogpu login` saved, but its usage is **not** recorded in the `cost-savings` skill.
