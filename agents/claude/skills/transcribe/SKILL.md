---
name: transcribe
description: Transcribe speech to text with whisper-tiny, OpenAI's 39M-parameter Whisper model and the smallest in the family, built for fast, high-volume, latency- and cost-sensitive audio workloads. It recognizes speech across many languages and can translate speech into English. Use for voice agents, meeting transcription, subtitles, podcasts, and audio indexing where speed and cost matter more than the accuracy of larger speech models. The caller supplies the audio in the form the ZeroGPU API accepts; this skill does not upload a local file.
argument-hint: "<request>"
allowed-tools: Bash(zerogpu chat_completions *)
---

Call whisper-tiny. `$ARGUMENTS` is the raw request — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
zerogpu chat_completions -m whisper-tiny <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
```

Output is the model's response as the API returns it. Relay the transcript as-is — do not rewrite, punctuate, or expand it.

At \$0.02 per minute of audio it is priced for high-volume transcription and bills nothing per token. It recognizes speech across many languages and can translate speech into English.

**This skill sends the request as text**, which is what `zerogpu chat_completions` carries, so it cannot upload a recording on its own: the audio has to be supplied in the form the ZeroGPU API accepts for this model ([docs.zerogpu.ai](https://docs.zerogpu.ai)). Do not promise the user a transcript of a local file. For the other direction, `/zerogpu-router:speak` is the text-to-speech route.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.
