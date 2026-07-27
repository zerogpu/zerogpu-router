---
name: chat-gpt-oss
description: Chat with gpt-oss-120b, ZeroGPU's largest open-weight model (117B MoE, 131K context). Use when a task needs more capability than the 1.2B edge models can give — longer documents, multi-step instructions, harder general-knowledge questions — but still does not warrant Claude.
argument-hint: "<text>"
allowed-tools: Bash(node -e *)
---

Call gpt-oss-120b. `$ARGUMENTS` is the raw prompt — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
export ZGPU_TEXT
node -e 'const fs=require("fs"),os=require("os"),path=require("path");let key=process.env.ZEROGPU_API_KEY;try{key=JSON.parse(fs.readFileSync(path.join(os.homedir(),".zerogpu","config.json"),"utf8")).apiKey||key}catch(e){}if(!key){console.error("Not signed in to ZeroGPU. Run: zerogpu login");process.exit(1)}fetch("https://api.zerogpu.ai/v1/responses",{method:"POST",headers:{"content-type":"application/json","x-api-key":key},body:JSON.stringify({model:"gpt-oss-120b",input:process.env.ZGPU_TEXT})}).then(async r=>{if(!r.ok){console.error("Request failed with status "+r.status+".");console.error(await r.text());process.exit(1)}return r.json()}).then(d=>{const m=(d.output||[]).find(o=>o.type==="message");const t=m&&(m.content||[]).find(c=>c.type==="output_text");console.log(t?t.text:JSON.stringify(d,null,2))}).catch(e=>{console.error("Request failed: "+e.message);process.exit(1)})'
```

Output is the assistant's answer as plain text. The model also produces an internal reasoning trace; the command above deliberately drops it and prints only the final answer. Relay that answer as-is — do not rewrite or expand it.

This skill calls the ZeroGPU API directly rather than through the `zerogpu` CLI, which has no command for this model. It still uses the credentials `zerogpu login` saved, but its usage is **not** recorded in `/zerogpu-router:cost-savings`.
