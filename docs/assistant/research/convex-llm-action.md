# Research: calling an LLM from a Convex action

Ticket: [#93](https://github.com/jdlam/timesync/issues/93). Feeds the engine
decision for the creator **Assistant** (map: [#91](https://github.com/jdlam/timesync/issues/91)).
This note does **not** decide the engine — it gives constraints and a
recommended shape only.

> **Vocabulary note**: the ticket asked to read `CONTEXT.md` at the repo root
> for the Assistant/Draft/Request/Turn vocabulary. That file does not exist
> yet in this repo (checked working tree and `origin/main`; no branch has
> it). The terms below are instead taken directly from issue #91's "Decisions
> so far" section, which defines them: **Assistant** (the in-app, creator-only,
> free-text feature), **Request** (the user's free-text input), **Draft**
> (the create form's running state that a Request fills), **Turn** (one
> Request/reply round-trip).

## Recommended shape

The least-code way to call an LLM provider from a Convex action and return
validated structured JSON to the browser, matching how this repo already
writes actions (`convex/stripe.ts`: a plain `action` from `./_generated/server`,
default runtime, no `"use node"`, secret read via `process.env` inside the
handler):

```ts
// convex/assistant.ts
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { v } from "convex/values";
import { z } from "zod";
import { action } from "./_generated/server";

const DraftPatchSchema = z.object({
  title: z.string().optional(),
  // ...one field per create-form field the Draft can fill
});

export const runTurn = action({
  args: { request: v.string() /* + prior Draft/Turn state as needed */ },
  handler: async (ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    const client = new Anthropic({ apiKey });
    const response = await client.messages.parse({
      model: "claude-opus-5", // or the cheapest-that-passes-the-golden-set choice
      max_tokens: 4096,
      messages: [{ role: "user", content: args.request }],
      output_config: { format: zodOutputFormat(DraftPatchSchema) },
    });

    return response.parsed; // already validated against DraftPatchSchema
  },
});
```

Client side: `useAction(api.assistant.runTurn)`, `await` it once per Turn, and
apply the returned patch to the client-held Draft state — matching #91's
"conversation state is client-held" decision.

Why this is the minimum:
- **No `"use node"`.** The Anthropic TypeScript SDK's own README lists Deno,
  Bun, Cloudflare Workers, and Vercel Edge Runtime as supported runtimes —
  all fetch-based, non-Node environments — and Convex's default runtime
  documents support for "most npm libraries that work in the browser, Deno,
  and Cloudflare workers," including `fetch`
  ([docs.convex.dev/functions/runtimes](https://docs.convex.dev/functions/runtimes)).
  No primary source states the Anthropic SDK-in-Convex-default-runtime
  combination directly — see Constraints below.
- **No manual JSON parsing.** `client.messages.parse()` +
  `output_config.format: zodOutputFormat(schema)` returns an
  already-validated object on `response.parsed`, reusing this repo's existing
  Zod convention (`src/lib/validation-schemas.ts`) as the single source of
  truth for the Draft's shape — no hand-written tool-use loop or `JSON.parse`.
- **No new abstraction for the API key.** `process.env.ANTHROPIC_API_KEY`,
  read inside the handler, is the exact pattern `convex/stripe.ts` already
  uses for `STRIPE_SECRET_KEY`.

## Constraints

### Action runtime: default (V8) vs `"use node"`

| | Default runtime | Node.js runtime (`"use node"`) |
|---|---|---|
| Enable | default | `"use node"` directive at top of the file |
| Packages/APIs | "most npm libraries that work in the browser, Deno, and Cloudflare workers"; `fetch`, `crypto`, streams, encoding APIs | full Node.js APIs and npm packages |
| Memory | 64 MiB | 512 MiB |
| Execution timeout | **30 minutes** | **10 minutes** |
| Argument size | 16 MiB | 5 MiB (reduced) |
| Can share a file with queries/mutations | yes | no — a `"use node"` file must contain no Convex queries/mutations |

Sources: [docs.convex.dev/functions/runtimes](https://docs.convex.dev/functions/runtimes),
[docs.convex.dev/production/state/limits](https://docs.convex.dev/production/state/limits)
(the limits page states both numbers explicitly: "Convex runtime action
execution time: 30 minutes" and "Node runtime action execution time: 10
minutes" — the default runtime's timeout is longer, not shorter).

This repo's only existing action (`convex/stripe.ts`, calling the Stripe
Node SDK) already runs in the default runtime with no `"use node"` — Stripe's
SDK works there.

### `useAction` and streaming

- `useAction(api.foo.bar)` returns an async function; the call resolves once
  with the action's full return value. There is no primary-source mention of
  a `useAction` caller receiving incremental/streamed updates from a plain
  action ([docs.convex.dev/functions/actions](https://docs.convex.dev/functions/actions),
  [docs.convex.dev/client/react](https://docs.convex.dev/client/react)).
- Convex does support streaming, but only via two other paths, both
  documented at [docs.convex.dev/agents/streaming](https://docs.convex.dev/agents/streaming):
  1. **HTTP actions** — the client `fetch()`s the HTTP action's URL directly
     (`https://<deployment>.convex.site/...`), not through `useAction`, and
     reads a streamed `Response` body. HTTP actions are documented as
     reachable only by direct HTTP call, not via `useAction`
     ([docs.convex.dev/functions/http-actions](https://docs.convex.dev/functions/http-actions)).
  2. **Delta-to-database** — the action (HTTP or not) writes incremental
     chunks to a table as it generates them, and the client subscribes with
     a normal reactive `useQuery`, which is how Convex's own Agent
     component streams.
- **Implication for this ticket**: a single-Turn action that returns one
  parsed JSON object (the recommended shape above) needs no streaming at
  all — `useAction` already fits it. Streaming only becomes a real decision
  if a future Turn's UX wants partial/incremental text before the full JSON
  is ready; that would require one of the two patterns above, not a plain
  action.

### Environment variables (API key storage)

- Set via `npx convex env set NAME 'value'` (or `--from-file`), or the
  Convex Dashboard's Deployment Settings — the same place this repo already
  configures `STRIPE_SECRET_KEY`, `SUPER_ADMIN_EMAILS`, etc. (per
  `CLAUDE.md`).
- Read in a function either via `process.env.KEY` (untyped — what
  `convex/stripe.ts` uses today) or a typed `env` object generated from
  validators declared in `convex/convex.config.ts` (newer, type-safe path).
- Limits: 512 variables per deployment, 512 KiB total, names ≤256 chars,
  values ≤8 KiB.
- Convex functions are exported based on the deployed code, not
  conditioned on env vars at runtime — don't branch which functions exist
  based on whether a key is set; check for it and throw inside the handler
  instead (as the sample above does).

Source: [docs.convex.dev/production/environment-variables](https://docs.convex.dev/production/environment-variables).

### Anthropic TypeScript SDK vs Vercel AI SDK vs raw `fetch`

| | Runs in Convex default runtime? | Source |
|---|---|---|
| Raw `fetch` | Yes — `fetch` is explicitly available in actions | [docs.convex.dev/functions/runtimes](https://docs.convex.dev/functions/runtimes) |
| Anthropic TypeScript SDK (`@anthropic-ai/sdk`) | Not stated by either party directly, but strongly implied: the SDK's README lists Deno, Bun, Cloudflare Workers, and Vercel Edge Runtime as supported (all fetch-based, non-Node), and Convex's default runtime advertises support for "most npm libraries that work in the browser, Deno, and Cloudflare workers." No Convex or Anthropic doc states the pairing explicitly. | [github.com/anthropics/anthropic-sdk-typescript README](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/README.md) + [docs.convex.dev/functions/runtimes](https://docs.convex.dev/functions/runtimes) |
| Vercel AI SDK (`ai`, `@ai-sdk/anthropic`) | **Unverified from a primary source.** Community/Discord discussion (Convex's own Discord-questions archive) states the default runtime added `TextDecoderStream` support so `streamText` etc. can be used in Convex **HTTP actions**; I could not find this on docs.convex.dev itself, and could not confirm it for plain (non-HTTP) actions. Treat as unconfirmed. | Not a primary doc — flagging per the ticket's instruction rather than citing as fact |

Given the ticket wants the *least code* to get structured JSON back, and the
Anthropic SDK's `messages.parse()` + `zodOutputFormat()` (see Recommended
shape) does that with a schema this repo would write anyway, raw `fetch`
(hand-rolling request/response typing) and the Vercel AI SDK (uncertain
runtime fit, and its structured-output helpers reimplement what the
Anthropic SDK already does directly against Claude) are both more code for
the same result *if the engine is Claude*. This is not a decision on the
engine — if the engine ends up being a non-Anthropic provider, the Vercel AI
SDK's provider-agnostic surface may cut differently.

## Component notes

### `@convex-dev/rate-limiter`

- **What it does**: application-level rate limiting with two algorithms —
  fixed window and token bucket — enforced transactionally (rolls back with
  the caller's mutation on failure), with optional sharding to reduce
  contention under high concurrency.
- **Setup**: `npm install @convex-dev/rate-limiter`, register in
  `convex/convex.config.ts` (`app.use(rateLimiter)`), then construct
  `new RateLimiter(components.rateLimiter, { name: {kind, rate, period, ...} })`
  once and call `.limit(ctx, name, {key?, count?, throws?})` from a mutation
  or action.
- **API**: `limit()` (consume), `check()` (inspect without consuming),
  `reset()`, `getValue()`. `reserve: true` lets a caller reserve future
  capacity and schedule retry via `ctx.scheduler.runAfter`.
- **Constraints**: explicitly *not* network-layer DDoS protection — it's an
  application-logic guard only. High-contention keys should use sharding
  (`shards ≈ (max QPS / 2)`, ≥5 capacity per shard) to avoid optimistic
  concurrency retries. Rate limit changes roll back transactionally with the
  caller.
- **Cost model in function calls**: not quantified in the README. Structurally,
  the component is a Convex component — `.limit()` reads/writes the
  component's own isolated tables, which (per
  [docs.convex.dev/components/understanding](https://docs.convex.dev/components/understanding))
  runs as "a sub-transaction isolated from other calls." Convex's own docs
  do not state an exact function-call multiplier for calling into a
  component; not verified from a primary source.
- Fits directly onto #91's "available to everyone with a rate limit"
  decision — one `.limit(ctx, "assistantTurn", {key: <client id>, throws: true})`
  call at the top of the action handler, before the LLM call.

Sources: [github.com/get-convex/rate-limiter README](https://github.com/get-convex/rate-limiter),
mirrored at [cdn.jsdelivr.net/npm/@convex-dev/rate-limiter/README.md](https://cdn.jsdelivr.net/npm/@convex-dev/rate-limiter@latest/README.md).

### `@convex-dev/workflow`

- **What it does**: durable multi-step orchestration. Workflows survive
  server restarts, can span months, support per-step retry configuration,
  sequential or parallel (`Promise.all`) step execution, reactive
  status queries, and cancellation/restart from an arbitrary step. Each step
  runs a query/mutation/action; between steps the workflow handler is not
  running — Convex deterministically replays the handler's code up to the
  next step on resume.
- **Setup**: `npm install @convex-dev/workflow`, register in
  `convex/convex.config.ts`, construct a `WorkflowManager` once against
  `components.workflow`.
- **Constraints**:
  - **1 MiB total data transfer** across all step inputs/outputs for one
    workflow execution (store large data in the DB and pass IDs instead).
  - **Determinism**: the workflow *handler body* itself must not call
    `fetch`, `Math.random()`, `Date.now()`, read uncontrolled env vars, or
    use unseeded crypto — those effects belong inside a step (an
    action/mutation/query), not the orchestrating function. An LLM call
    (which needs `fetch`) must be its own action step, never inlined into
    the workflow definition.
  - Adding, removing, or reordering steps on a workflow with in-flight
    executions causes determinism-violation failures — the step sequence is
    effectively part of the deployed contract while any instance is running.
  - `maxParallelism` (a workpool option) bounds concurrent step execution;
    Convex's own guidance is to keep the combined total across all
    workflows and workpools under ~100 on a Pro account.
- **Cost model in function calls**: not quantified in the README beyond
  the 1 MiB data-transfer ceiling and the general note that step arguments
  and return values count against it. No explicit "N function calls per
  step" figure found in the primary README.

Sources: [github.com/get-convex/workflow README](https://github.com/get-convex/workflow),
mirrored at [cdn.jsdelivr.net/npm/@convex-dev/workflow@0.2.4/README.md](https://cdn.jsdelivr.net/npm/@convex-dev/workflow@0.2.4/README.md).

**Fit for a single-Turn Assistant**: today's Assistant is one Request → one
Turn → one Draft patch — a single action call, no multi-step orchestration,
no need to survive a server restart mid-Turn. `@convex-dev/workflow` is built
for orchestration spanning multiple steps/retries over long real time, which
this shape does not need. It becomes relevant only if a Turn grows into a
multi-step pipeline (e.g., extract → validate → repair-on-failure across
separate calls) — a shape not yet decided.

## Sources

- [docs.convex.dev/functions/actions](https://docs.convex.dev/functions/actions) — actions overview, `useAction`, runtime/package availability
- [docs.convex.dev/functions/runtimes](https://docs.convex.dev/functions/runtimes) — default vs Node.js runtime, `"use node"`
- [docs.convex.dev/production/state/limits](https://docs.convex.dev/production/state/limits) — exact timeout/memory/argument-size numbers
- [docs.convex.dev/production/environment-variables](https://docs.convex.dev/production/environment-variables) — env var storage/access, limits
- [docs.convex.dev/functions/http-actions](https://docs.convex.dev/functions/http-actions) — HTTP actions, direct-fetch-only calling convention
- [docs.convex.dev/agents/streaming](https://docs.convex.dev/agents/streaming) — the two streaming patterns (HTTP response stream vs. delta-to-database)
- [docs.convex.dev/components](https://docs.convex.dev/components) / [docs.convex.dev/components/understanding](https://docs.convex.dev/components/understanding) — component isolation, sub-transaction semantics
- [github.com/anthropics/anthropic-sdk-typescript README](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/README.md) — supported runtimes (Deno, Bun, Cloudflare Workers, Vercel Edge Runtime), Node version floor
- [github.com/get-convex/rate-limiter README](https://github.com/get-convex/rate-limiter) (mirror: [jsdelivr](https://cdn.jsdelivr.net/npm/@convex-dev/rate-limiter@latest/README.md))
- [github.com/get-convex/workflow README](https://github.com/get-convex/workflow) (mirror: [jsdelivr](https://cdn.jsdelivr.net/npm/@convex-dev/workflow@0.2.4/README.md))
- Repo: `convex/stripe.ts` (existing action convention — default runtime, `process.env` secret access), `package.json` (`convex: ^1.31.5`)
- Not verified from a primary source (flagged, not asserted as fact): Vercel AI SDK's `streamText` working in a Convex default-runtime **HTTP action** via `TextDecoderStream` support — only found via a Convex Discord-questions community thread, not docs.convex.dev
