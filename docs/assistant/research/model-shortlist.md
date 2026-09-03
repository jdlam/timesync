# Model shortlist: cost per Turn for the Assistant's extraction call

Research for [#92](https://github.com/jdlam/timesync/issues/92), off the Assistant wayfinder map
([#91](https://github.com/jdlam/timesync/issues/91)). Scope per the ticket: produce a shortlist and
the numbers only — the decision rule ("cheapest that passes the golden set, ceiling ~1 US cent per
Turn") is already fixed, and picking a model is a later ticket.

**Vocabulary** (from #91's Decisions so far, since `CONTEXT.md` does not exist in this repo yet):
**Assistant** — the in-app, creator-facing feature that fills the create form as a running **Draft**
over multiple **Turns**, from free-text **Requests**. Fields the form drops fall into **Overflow**.
This ticket is about the model that powers one Turn's extraction call: read the Request + running
Draft, emit structured JSON that updates the Draft.

## Summary

Assumed Turn shape: ~1,500 input tokens (system prompt + conversation so far), ~300 output tokens
(structured JSON). All costed at each provider's **standard, non-batch, non-cached** rate — a
cold Turn, worst case for cost.

| Model | Access | Input $/MTok | Output $/MTok | Cost / Turn | Structured output | Notes |
|---|---|---:|---:|---:|:---:|---|
| Claude Haiku 4.5 | Anthropic API (direct) | $1.00 | $5.00 | **$0.0030** | Yes — `output_config.format`, strict tool use | Cheapest current-gen Claude model |
| Claude Haiku 3.5 | Anthropic API — **retired** except Bedrock/Vertex | $0.80 | $4.00 | $0.0024 | Not confirmed on the structured-outputs page (list starts at Haiku 4.5) | Not deployable as new on the direct Claude API |
| OpenAI GPT-5 Nano | via OpenRouter (also direct OpenAI) | $0.05 | $0.40 | **$0.0002** | Yes — `response_format: json_schema`, `strict_outputs` | Cheapest of the four |
| Google Gemini 2.5 Flash-Lite | via OpenRouter (also direct Google) | $0.10 | $0.40 | **$0.0003** | Yes — `structured_outputs` (OpenRouter); Google's current struct-output guide documents Gemini 3.x primarily, 2.5 support not directly confirmed in that guide | Confirmed non-legacy, active pricing on Google's own page |
| DeepSeek V4 Flash | via OpenRouter (blended rate) | $0.0886 | $0.1772 | **$0.0002** | Yes — "Json Output" ✓ per DeepSeek's own pricing page | DeepSeek's **own** API prices this far higher and time-of-day variable — see caveat below |

All five options clear the ~1¢/Turn ceiling by 3x (Haiku 3.5) to 50x (GPT-5 Nano) at these assumed
token counts. Haiku 4.5 is ~10-15x the OpenRouter options' cost but is the only one with a same-vendor
first-party structured-outputs guide that names the exact model ID.

## Arithmetic

Cost = (input_tokens ÷ 1,000,000 × price_in) + (output_tokens ÷ 1,000,000 × price_out), at 1,500 input / 300 output tokens.

- **Claude Haiku 4.5**: (1500 ÷ 1e6 × $1.00) + (300 ÷ 1e6 × $5.00) = $0.0015 + $0.0015 = **$0.0030**
- **Claude Haiku 3.5** (retired on direct API): (1500 ÷ 1e6 × $0.80) + (300 ÷ 1e6 × $4.00) = $0.0012 + $0.0012 = **$0.0024**
- **GPT-5 Nano**: (1500 ÷ 1e6 × $0.05) + (300 ÷ 1e6 × $0.40) = $0.000075 + $0.00012 = **$0.000195**
- **Gemini 2.5 Flash-Lite**: (1500 ÷ 1e6 × $0.10) + (300 ÷ 1e6 × $0.40) = $0.00015 + $0.00012 = **$0.00027**
- **DeepSeek V4 Flash** (OpenRouter blended): (1500 ÷ 1e6 × $0.088606) + (300 ÷ 1e6 × $0.177212) = $0.0001329 + $0.0000532 = **$0.0001861**
- **DeepSeek V4 Flash** (DeepSeek's own API, cache-miss, peak hours — worst case): (1500 ÷ 1e6 × $0.44) + (300 ÷ 1e6 × $1.32) = $0.00066 + $0.000396 = **$0.001056** — still under the 1¢ ceiling, but ~5.7x the OpenRouter figure.

## Per-model notes

### Claude Haiku 4.5 (`claude-haiku-4-5`, direct Anthropic API)

- **Pricing**: $1/MTok input, $5/MTok output. Batch API: $0.50/$2.50 (50% off, async). 5-minute
  prompt-cache write: $1.25/MTok; cache read: $0.10/MTok. Source:
  [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing).
- **Model facts**: 200K context window, 64K max output, no adaptive-thinking default (`effort` not
  supported), reliable knowledge cutoff Feb 2025. Source:
  [platform.claude.com/docs/en/models/overview](https://platform.claude.com/docs/en/models/overview).
- **Structured output**: `claude-haiku-4-5-20251001` is explicitly listed as a supported model for
  `output_config.format` structured outputs and strict tool use, on the Claude API, Claude Platform
  on AWS, Amazon Bedrock, Google Cloud, and Microsoft Foundry. First use of a given schema pays a
  one-time "grammar compilation" latency cost; compiled grammars are cached 24h from last use.
  Anthropic's documentation states the guarantee is unconditional ("always valid," "no retries
  needed for schema violations") — no reliability caveat noted for Haiku 4.5 specifically. Source:
  [platform.claude.com/docs/en/build-with-claude/structured-outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).
- **Rate limits** (Start tier, the default for a new org): 1,000 RPM, 2,000,000 ITPM, 400,000 OTPM —
  same ceiling as Sonnet 5 and Opus 5/4.x on this tier; scales up on Build/Scale tiers. Only
  uncached input tokens count toward ITPM. Source:
  [platform.claude.com/docs/en/api/rate-limits](https://platform.claude.com/docs/en/api/rate-limits).
- **Latency**: Anthropic's own model-comparison table rates Haiku 4.5 "Fastest" among the current
  lineup (relative ranking, not an absolute number). Source: same models/overview page above.

### Claude Haiku 3.5 (any cheaper current Claude tier — checked, not viable)

- $0.80/MTok input, $4/MTok output — slightly cheaper than Haiku 4.5, but Anthropic's own pricing
  page marks it **"retired, except on Bedrock and Google Cloud."** It cannot be called fresh on the
  direct Claude API used elsewhere in this stack, so it's listed only to answer "any cheaper current
  Claude tier" honestly: **there isn't one on the API path this repo would use.** Its structured-output
  support wasn't independently confirmed — the structured-outputs guide's model list starts at
  Haiku 4.5 and doesn't mention 3.5. Source: same pricing and structured-outputs pages above.

### OpenAI GPT-5 Nano (`openai/gpt-5-nano` on OpenRouter)

- **Pricing**: $0.05/MTok input, $0.40/MTok output — confirmed identically on OpenAI's own pricing
  page and via the OpenRouter models API. Sources:
  [developers.openai.com/api/docs/pricing](https://developers.openai.com/api/docs/pricing) (redirect
  target of `platform.openai.com/docs/pricing`) and
  [openrouter.ai/api/v1/models](https://openrouter.ai/api/v1/models) (queried directly, 2026-09-03).
- **Structured output**: OpenAI's Structured Outputs guide (`json_schema` + `strict: true`) states
  the feature is "available in our latest large language models, starting with GPT-4o," and that
  the model "will always generate responses that adhere to your supplied JSON Schema" — but the
  fetched guide text did not explicitly name GPT-5 Nano by tier, only recommending `gpt-5.6` "for
  new projects." OpenRouter's own model metadata lists `structured_outputs` and `response_format`
  as supported parameters for `openai/gpt-5-nano` specifically — treat that as the more concrete
  confirmation for this exact model. Sources:
  [developers.openai.com/api/docs/guides/structured-outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
  and the OpenRouter models API response above.
- **Context / output cap**: 400K context, 128K max completion tokens per OpenRouter's `top_provider`
  metadata.
- **Latency / reliability**: Not independently verified against an OpenAI-published number in this
  pass — OpenAI's guide only notes that a schema's *first* use costs extra latency while it compiles,
  with no such cost on repeat use of the same schema. Rate limits: OpenRouter's own FAQ says
  per-model paid rate limits are provider- and account-tier-dependent and didn't resolve to a number
  in this pass; check `openrouter.ai/docs` → rate limits, or OpenAI's own per-tier RPM/TPM table,
  before committing to this model.

### Google Gemini 2.5 Flash-Lite (`google/gemini-2.5-flash-lite` on OpenRouter)

- **Pricing**: $0.10/MTok input (text/image/video; $0.30 for audio), $0.40/MTok output — confirmed
  identically on Google's own pricing page and via OpenRouter. Google's page states explicitly the
  model is "not marked as legacy or deprecated," describing it as "a small and cost effective model,
  built for at scale usage." Batch tier: $0.05/$0.20. Sources:
  [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing) and the
  OpenRouter models API.
- **Structured output**: OpenRouter's model metadata lists `structured_outputs` and `response_format`
  as supported parameters. Google's own current structured-output guide
  ([ai.google.dev/gemini-api/docs/structured-output](https://ai.google.dev/gemini-api/docs/structured-output))
  documents `response_format` / `mime_type` / `schema` but — in the fetched version — names only
  Gemini 3.x models (3.8 Flash, 3-series, 3.1-pro-preview) in its examples; it does not explicitly
  confirm or deny 2.5 Flash-Lite. Given the model is still actively priced and sold, and OpenRouter
  reports the parameter as supported, structured JSON output is very likely available, but **this
  is not a confirmed-by-primary-source claim** the way it is for Haiku 4.5 or GPT-5 Nano — flag for
  a golden-set smoke test before relying on it.
- **Context / output cap**: 1,048,576 context tokens, 65,535 max completion tokens per OpenRouter.

### DeepSeek V4 Flash (`deepseek/deepseek-v4-flash` on OpenRouter)

- **Pricing — two different numbers, worth flagging as the main caveat for this model:**
  - **Via OpenRouter** (queried live): $0.0886/MTok input, $0.1772/MTok output — a blended rate.
  - **Via DeepSeek's own API** (peak/off-peak, cache hit/miss — DeepSeek prices by both): off-peak
    cache-miss $0.22 in / $0.66 out; **peak** cache-miss $0.44 in / $1.32 out. Peak hours are
    "01:00–04:00 and 06:00–10:00 UTC, Monday through Friday." Source:
    [api-docs.deepseek.com/quick_start/pricing](https://api-docs.deepseek.com/quick_start/pricing).
  - Even at DeepSeek's own worst-case (peak, cache-miss) price, the Turn still costs ~$0.0011 —
    comfortably under the 1¢ ceiling — but it is the only one of the four cheap options whose price
    genuinely moves several-fold depending on time of day and cache state, which OpenRouter's single
    blended number obscures.
- **Structured output**: DeepSeek's pricing page marks "Json Output" supported (✓) for this model;
  OpenRouter's metadata separately lists `structured_outputs` and `response_format` as supported
  parameters.
- **Rate limits**: DeepSeek does not publish RPM/TPM limits — it rate-limits by **concurrent
  connections**: 2,500 concurrent connections for `deepseek-v4-flash` (500 for the larger `-pro`
  tier). A request that hasn't started inference after 10 minutes has its connection closed by the
  server; exceeding concurrency returns HTTP 429. Higher concurrency is available on request.
  Source: [api-docs.deepseek.com/quick_start/rate_limit](https://api-docs.deepseek.com/quick_start/rate_limit).
- **Context / output cap**: 1,048,576 context tokens, 384,000 max completion tokens per OpenRouter.

## Cross-cutting caveats

- **OpenRouter as an access path**: OpenRouter states it passes through underlying-provider inference
  pricing "without any markup" — its own revenue comes from a 5.5% (Stripe) / 5% (crypto) fee on
  credit *purchases*, not a per-token markup on model calls. It also pools multiple upstream
  providers per model and fails over automatically on a provider outage, which is a reliability
  upside not available when calling a single provider directly — but the FAQ page fetched here gave
  no quantified uptime/SLA numbers to compare against Anthropic's or OpenAI's own SLAs. Source:
  [openrouter.ai/docs/faq](https://openrouter.ai/docs/faq).
- **Rate limits are not apples-to-apples across the four options**: Anthropic publishes numeric
  RPM/ITPM/OTPM by usage tier; DeepSeek limits by concurrent connections instead; OpenRouter's
  per-model paid-tier rate limit mechanics weren't resolved to a number in this pass. Before
  committing to a model, re-verify the specific limit that would gate the Assistant's expected
  Turn volume.
- **Structured-output confirmation strength differs by model**: Haiku 4.5 and DeepSeek V4 Flash have
  a primary source naming the exact model; GPT-5 Nano's primary-source guide names the family but
  not the nano tier explicitly (OpenRouter's metadata does); Gemini 2.5 Flash-Lite's support is
  inferred from OpenRouter's metadata and Google's active-pricing status, not confirmed by name in
  Google's current structured-output guide. Recommend a golden-set smoke test on each candidate
  before use, not just a docs check.
- **Latency**: only Anthropic (relative "fastest in lineup" ranking) and OpenAI (first-schema-use
  compile cost, then cached) published anything usable here; none published an absolute
  time-to-first-token or time-to-completion figure for these specific models in the pages fetched.
  If p50/p95 latency matters for the ceiling decision, it will need a direct benchmark, not docs.
- **`CONTEXT.md` does not exist at the repo root** in this worktree as of this research — the
  vocabulary above was sourced from issue #91's "Decisions so far" instead. Flagging per the
  ticket's instruction to read `CONTEXT.md`; someone running `domain-modeling` should create it.

## Sources

- Anthropic — model comparison table (pricing, context, IDs):
  https://platform.claude.com/docs/en/models/overview
- Anthropic — full model pricing table (base/cache/batch):
  https://platform.claude.com/docs/en/about-claude/pricing
- Anthropic — rate limits by usage tier:
  https://platform.claude.com/docs/en/api/rate-limits
- Anthropic — structured outputs (supported models, latency/caching, reliability claim):
  https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- OpenAI — pricing (GPT-5 Nano row): https://developers.openai.com/api/docs/pricing
  (redirect target of https://platform.openai.com/docs/pricing)
- OpenAI — Structured Outputs guide: https://developers.openai.com/api/docs/guides/structured-outputs
- Google — Gemini API pricing (2.5 Flash-Lite row, active/non-legacy status):
  https://ai.google.dev/gemini-api/docs/pricing
- Google — Gemini structured output guide (examples reference Gemini 3.x, not confirmed for 2.5):
  https://ai.google.dev/gemini-api/docs/structured-output
- DeepSeek — API pricing (peak/off-peak, cache hit/miss, JSON Output column):
  https://api-docs.deepseek.com/quick_start/pricing
- DeepSeek — rate limits (concurrency model): https://api-docs.deepseek.com/quick_start/rate_limit
- OpenRouter — models API (live query, 2026-09-03), used for cross-provider pricing confirmation
  and `supported_parameters` (`structured_outputs`, `response_format`) on all three OpenRouter
  candidates: https://openrouter.ai/api/v1/models
- OpenRouter — FAQ (no-markup pricing claim, credit-purchase fees, provider failover):
  https://openrouter.ai/docs/faq
- GitHub issue #91 (Assistant wayfinder map — vocabulary, decision rule, standing preferences):
  https://github.com/jdlam/timesync/issues/91
