# 05 — Technical Architecture

Stack recommendation and system design for a solo builder working with Claude Code.
Optimized for: fast iteration, strong SEO, cheap hosting, and clean AI integration.

---

## 1. Stack decision

### Recommended: Option A — Next.js all-in-one

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15+ (App Router, RSC)** | One repo for pages + API routes + streaming AI; best Claude Code ergonomics; ISR gives static-page SEO |
| Language | TypeScript everywhere | Shared Zod schemas between pipeline, API, and UI |
| Styling | Tailwind CSS v4 + shadcn/ui | Matches design-token workflow from Claude Design; shadcn gives drawer/dialog/dropdown primitives |
| Canvas | **@xyflow/react (React Flow v12)** | Pan/zoom viewer *and* drag-drop editor from one library; custom node types for topic/subtopic/label |
| Auto-layout | **elkjs** (layered) or dagre | Turns AI-generated graphs (no positions) into clean top-down layouts |
| DB | Postgres — **Neon** (or Supabase) | Serverless, EU region available (you're in Germany), branching for dev |
| ORM | Drizzle | Lightweight, SQL-first, plays well with Claude Code |
| Auth | **Auth.js v5** (Google + GitHub + Resend magic link) | Boring and done in a day |
| AI | **Vercel AI SDK** (`ai` + `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`; OpenRouter via its OpenAI-compatible endpoint) | One abstraction over all four BYOK providers; streaming + structured output built in |
| Cache/limits | Upstash Redis (optional) | Generation locks + IP rate limiting for a shared public instance; skip entirely for pure self-host |
| Email | Resend | Magic links + newsletter later |
| Analytics | PostHog (EU cloud) or Plausible | Privacy-friendly; you're GDPR-bound |
| Hosting | Vercel (or Cloudflare Pages + Workers if cost-sensitive) | Zero-ops |
| Testing | Vitest + Playwright | Playwright drives canvas interactions |

### Option B — Astro + React islands (closer to the original's architecture)
Astro statically renders the content site with React islands for the canvas/AI parts.
Pros: best-in-class static performance for hundreds of SEO pages. Cons: you'll still need
a separate API layer (Astro endpoints or a small Hono server), two mental models, and
Claude Code sessions juggle more moving parts. **Pick B only if SEO volume becomes the
whole business; otherwise A.**

## 2. System diagram

```
Browser
  ├── Static/ISR pages (home, roadmap pages, guides)  ← Next.js RSC, CDN-cached
  ├── Canvas island (React Flow)  ── GET graph JSON (cached)
  ├── Drawer  ── GET topic payload
  └── AI hub (client; key from localStorage) ── SSE ──► /api/ai/* ──► user-chosen
                                        │                  provider (OpenAI / Anthropic /
                                        │                  Gemini / OpenRouter)
                                        ├── Zod validation / repair loop
                                        ├── key held in memory only — never stored/logged
                                        └── (optional) generation lock + IP rate limit
Content pipeline (local scripts, doc 06) ──► seeds Postgres (roadmaps/topics/quizzes)
                                          └► triggers ISR revalidation + sitemap rebuild
```

## 3. Rendering & performance strategy

- **Roadmap pages:** `generateStaticParams` over official slugs; page shell + SEO block
  are RSC/static; canvas is a client island receiving the graph JSON as a prop (no
  second fetch on first paint). ISR revalidate on content updates via
  `revalidateTag('roadmap:slug')` from the pipeline.
- **Canvas:** custom React Flow node components per type; node status class comes from a
  Zustand store hydrated from localStorage (anon) or `/api/progress` (auth). Keep the
  graph ≤ ~150 nodes; virtualize nothing — React Flow handles this size fine.
- **Drawer content:** prefetch on node hover; render markdown server-side to HTML at
  seed time (store both `body_md` and `body_html`) so the drawer never ships a markdown
  parser to the client.
- **Progress writes:** optimistic UI, debounced batch PUT (500ms), retry queue offline.
- **Mobile:** drawer becomes a bottom sheet; canvas gets `panOnDrag` + pinch zoom;
  provide a linear "list view" toggle (accessibility + small screens) that renders topics
  in `order` — cheap to build, big usability win.

## 4. AI integration architecture (runtime)

**BYOK provider registry:** a single `getModel(tier)` helper resolves the caller's
provider + chosen models. Two tiers cover everything:

| Tier | Used for | OpenAI | Anthropic | Gemini | OpenRouter |
|---|---|---|---|---|---|
| `smart` | roadmap graphs, topic content, chat | flagship GPT | Claude Sonnet | Gemini Pro | any user-picked model |
| `fast` | quizzes, JSON repair pass | mini variant | Claude Haiku | Gemini Flash | any user-picked model |

Populate the model dropdowns from a small static catalog per provider **plus a free-text
override**, so new model releases never require a code change.

**Key handling (the BYOK contract):**
- The key lives in the browser (localStorage, per provider) and is attached to each AI
  request; the server holds it in memory for the duration of the call, forwards it to
  the provider, and never writes it to the DB, logs, or error reports (scrub before
  Sentry).
- The seeding pipeline (doc 06) uses *your own* key from `.env` — a completely separate
  code path from user keys.
- A "Test key" endpoint makes a minimal call and maps provider error codes to
  human-readable messages (invalid key, out of credit, model unavailable).
- If you later want server-stored keys for convenience, encrypt per user (libsodium
  sealed box) — but client-side-only is the simpler, lower-liability default.

**Structured output pattern (use everywhere):**
1. Prompt includes the JSON schema (doc 04 §3) and 1 small example.
2. Parse → Zod validate.
3. On failure: one automatic repair call with the validator errors pasted in.
4. On second failure: surface a retry UI; never render unvalidated graphs.

**Chat context assembly (server-side, never trust client):** system prompt = tutor
persona + the roadmap's node list with statuses (compact text outline, not raw JSON) +
the currently open topic's body. Cap history at ~20 messages; summarize older turns.

**Cost transparency (replaces metering):** every AI response returns the provider's
usage figures; the UI shows tokens (and an approximate cost from a static price table)
per action and per session. There are no server-enforced limits — users pay their own
provider directly.

**Guardrails:** per-request `max_tokens` caps (protects the *user's* wallet from
runaway generations); a lock so one user can't run parallel generations; token usage
logged into `chat_messages.tokens` / `events` for the session-cost display; kill-switch
env var `AI_DISABLED=1`.

## 5. Security & compliance notes

- All AI inputs are untrusted: strip/refuse prompt-injection attempts in editor AI-assist
  (the assist prompt only ever receives node labels, never arbitrary URLs/file paths).
- Sanitize `body_html` at seed time (rehype-sanitize) since it originated from a model.
- GDPR (you're in Berlin): EU region DB + analytics, account deletion endpoint (cascade
  is already in the schema), Impressum + privacy page before public launch, no
  third-party ad trackers at MVP.
- Secrets only in env; `.env.example` committed, `.env` gitignored.

## 6. Environments & workflow

- `dev` (local, Neon branch) → `preview` (Vercel PR deploys, seeded with 2 sample
  roadmaps) → `prod`. Pipeline scripts run locally with a `--target=prod` flag guarded
  by confirmation. CI: typecheck + vitest + Playwright smoke (home, one roadmap,
  drawer open, progress persists) on every PR — Claude Code should keep these green.
