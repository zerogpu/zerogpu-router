---
name: chat-qwen
description: Chat with qwen3-30b-a3b-fp8, a 30.5B MoE model with strong multilingual coverage (100+ languages, 32K context). Use for non-English prompts, translation-adjacent tasks, or mid-weight questions the 1.2B edge models handle poorly.
argument-hint: "<text>"
allowed-tools: Bash(node -e *)
---

Call qwen3-30b-a3b-fp8. `$ARGUMENTS` is the raw prompt — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
export ZGPU_TEXT
node -e 'const fs=require("fs"),os=require("os"),path=require("path");let key=process.env.ZEROGPU_API_KEY;try{key=JSON.parse(fs.readFileSync(path.join(os.homedir(),".zerogpu","config.json"),"utf8")).apiKey||key}catch(e){}if(!key){console.error("Not signed in to ZeroGPU. Run: zerogpu login");process.exit(1)}fetch("https://api.zerogpu.ai/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json","x-api-key":key},body:JSON.stringify({model:"qwen3-30b-a3b-fp8",messages:[{role:"user",content:process.env.ZGPU_TEXT}]})}).then(async r=>{if(!r.ok){console.error("Request failed with status "+r.status+".");console.error(await r.text());process.exit(1)}return r.json()}).then(d=>{const c=d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content;console.log(c?c.trim():JSON.stringify(d,null,2))}).catch(e=>{console.error("Request failed: "+e.message);process.exit(1)})'
```

This model is served on Chat Completions only — the Responses endpoint is not available for it. Output is the assistant's answer as plain text; the model's separate reasoning field is deliberately dropped. Relay the answer as-is — do not rewrite or expand it.

This skill calls the ZeroGPU API directly rather than through the `zerogpu` CLI, which has no command for this model. It still uses the credentials `zerogpu login` saved, but its usage is **not** recorded in `/zerogpu-router:cost-savings`.
