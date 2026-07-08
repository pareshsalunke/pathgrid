# 08 — Claude Code Implementation Plan

Phased build plan with a ready-to-paste starter `CLAUDE.md` and per-phase prompts.
Assumes the Option A stack from doc 05 (Next.js 15, TS, Tailwind, Drizzle/Neon,
React Flow, Auth.js, Vercel AI SDK with the BYOK provider registry).

---

## 0. Working method (read once)

- One phase per Claude Code session-cluster. Start each phase in **plan mode**: ask for
  a plan, review it against the doc, then approve implementation.
- Keep this pack in `/docs/` and the design exports in `/docs/design/` — reference them
  by filename in prompts ("follow docs/04-data-model.md §3").
- Definition of done per phase = its checklist below + `pnpm typecheck && pnpm test`
  green + the Playwright smoke passing.
- Commit per completed checklist item; small diffs keep review sane.

## Phase 0 — Scaffold (½ day)

- [ ] `create-next-app` (TS, App Router, Tailwind), pnpm, ESLint/Prettier, Vitest,
      Playwright with one trivial test.
- [ ] Drizzle + Neon connection; migration setup; `.env.example`.
- [ ] shadcn/ui init; import design tokens from `/docs/design/tokens.json` into
      Tailwind theme (CSS variables).
- [ ] Base layout: header (nav per doc 03 §1, dropdowns), footer; dark theme default.
- [ ] Deploy empty shell to Vercel; name the project `pathgrid` (this reserves
      `pathgrid.vercel.app` — the free home until the custom domain is bought).
- [ ] Domain-agnostic URLs: single `APP_URL` env var drives every absolute URL
      (auth callbacks, OG images, sitemap, canonicals, emails) — never hardcode the
      deployment host. Custom-domain migration later = change this var + OAuth
      console entries.
- [ ] `SEO_INDEXING=off` env flag → emits `noindex` meta site-wide; stays off on
      vercel.app so Google never indexes the temporary host; flipped on when the
      real domain goes live.

**Prompt seed:** "Read docs/05-tech-architecture.md and docs/03-information-architecture.md
§1–2. Scaffold the project per Phase 0 of docs/08. Plan first."

## Phase 1 — Content core (the product) (2–4 days)

- [ ] Drizzle schema for: users, roadmaps, roadmap_versions, topics, resources
      (doc 04 §2) + migrations.
- [ ] Zod schemas for the graph format (doc 04 §3) in `/lib/schemas` (shared).
- [ ] Seed script `pnpm seed:sample` inserting 2 small hand-written sample roadmaps
      (use the Markdown-Basics example shape) so UI work never waits on AI.
- [ ] `/` home: hero, role/skill card grids from DB, bookmark icon (non-functional until
      Phase 2), section chips.
- [ ] `/[roadmapSlug]`: static generation, header strip, **React Flow canvas** with
      custom node components (title/topic/subtopic/label/section, 4 status styles),
      elkjs layout util for position-less graphs, zoom/fit controls, legend.
- [ ] Topic drawer: fetch payload, markdown-rendered body (pre-rendered HTML), resource
      list, status selector writing to a Zustand store + localStorage; progress bar
      derives from store.
- [ ] SEO block + FAQ accordion rendered server-side from `roadmaps.seo`.
- [ ] Playwright: open roadmap → click node → drawer shows → mark done → reload →
      still done (localStorage).

## Phase 2 — Accounts & persistence (1–2 days)

- [ ] Auth.js: Google, GitHub, Resend magic link; session in RSC.
- [ ] Progress API (GET/PUT batched) + merge-on-signup endpoint; store switches from
      localStorage to server sync when authed (keep optimistic writes).
- [ ] Bookmarks CRUD + header state.
- [ ] `/dashboard` per doc 03 §3.4; `/settings` with delete-account (cascades).
- [ ] Events table + tiny `track()` helper; instrument node_status_set, signup,
      bookmark.

## Phase 3 — AI runtime (3–5 days)

- [ ] Settings → AI Provider UI: provider selector (OpenAI / Anthropic / Gemini /
      OpenRouter), masked key input stored in localStorage, "Test key" endpoint with
      mapped error messages, smart/fast model pickers with free-text override.
- [ ] `/lib/ai`: provider registry on the Vercel AI SDK (`getModel(tier)` resolves the
      caller's provider + models; keys accepted per request, held in memory only),
      structured-output helper (generate → Zod → one repair pass), token logging.
- [ ] `POST /api/ai/roadmap`: two-pass generation per doc 06 §3.6, SSE progress events,
      elkjs layout, save as roadmap (owner, private) + generated_items row; returns
      usage figures for the cost display.
- [ ] `/ai` hub UI: create form, streaming stepper, canvas preview, My Learning list,
      provider/model chip + session token counter; missing-key states deep-link to
      Settings.
- [ ] `POST /api/ai/chat` + chat UI: roadmap-grounded system prompt (doc 06 §3.7),
      streaming, thread persistence, per-thread token readout.
- [ ] Quiz: `POST /api/ai/quiz` (cache per topic), drawer "Quiz me" flow, grading +
      attempts.
- [ ] Generation lock, provider-error mapping (invalid key / out of credit / model
      unavailable → actionable messages), `AI_DISABLED` kill switch, `/admin/ai` usage
      table (tokens/day per feature, powered by the events log).

## Phase 4 — Content pipeline & real catalog (2–3 days + review time)

- [ ] `/pipeline` CLI (tsx scripts): steps 1–9 of doc 06 §2, resumable outputs in
      `/pipeline/out/`, `--publish` flag gated on review.
- [ ] Critique-pass report + a minimal local review page (render draft roadmap +
      checklist).
- [ ] Generate 5 roadmaps → review → publish → ISR revalidation + sitemap rebuild.
- [ ] Batch remaining catalog (~20 roadmaps) once quality is proven.

## Phase 5 — Editor + SEO extras (P1 scope) (3–5 days)

- [ ] `/editor/[id]`: React Flow editing (add/connect/delete/rename), autosave PATCH,
      share-by-link visibility, node properties panel.
- [ ] AI-assist popover ("add 5 subtopics under selected node") using the configured
      provider key.
- [ ] Per-topic pages `/[roadmap]/[topic]`, guides section, search (Postgres
      full-text is fine), OG-image route, related-roadmaps block.

## Phase 6 — Distribution packaging (share it with other BYOK users)

- [ ] Self-hoster README: setup in <10 minutes (clone → env → migrate → seed → run),
      per-provider key instructions (where to create OpenAI / Anthropic / Gemini /
      OpenRouter keys), screenshots.
- [ ] One-click paths: Vercel Deploy button + `docker-compose.yml` (app + Postgres).
- [ ] `SINGLE_USER=1` mode: skips auth entirely, one implicit local user — ideal for
      pure personal use; document the tradeoffs.
- [ ] Repo license for YOUR code (MIT or AGPL — decide), CONTRIBUTING stub, versioned
      releases; secrets audit before publishing (no keys in code or fixtures, log
      scrubbing verified).

---

## Starter CLAUDE.md (paste at repo root)

```markdown
# Pathgrid

AI-native interactive learning-roadmap platform (roadmap.sh-category product,
original code/content/brand). Solo project; optimize for shipping.

## Stack
Next.js 15 App Router + TypeScript (strict) · Tailwind v4 + shadcn/ui ·
Drizzle + Postgres (Neon) · Auth.js v5 · @xyflow/react + elkjs · Vercel AI SDK
(BYOK: OpenAI / Anthropic / Gemini / OpenRouter) · Vitest + Playwright · pnpm.

## Commands
pnpm dev · pnpm typecheck · pnpm test · pnpm e2e · pnpm db:migrate ·
pnpm seed:sample · pnpm pipeline <step> --slug=<roadmap>

## Source of truth
Specs live in /docs (01–08). When implementing, cite the doc+section you followed.
Graph JSON schema: docs/04-data-model.md §3 — never render a graph that failed Zod.
Design tokens: docs/design/tokens.json — no hardcoded colors; use theme vars.

## Conventions
- RSC by default; "use client" only for canvas, drawer, AI hub, forms.
- All API bodies Zod-validated; AI structured outputs go through lib/ai/structured.ts
  (generate → validate → one repair pass → fail loudly).
- DB access only via /lib/db repositories; no queries in components.
- Every AI route: resolve models via lib/ai/registry; user keys arrive per request and
  live in memory only — never in DB, logs, or error reports; log token usage to events.
- Progress writes are optimistic + batched; never block UI on network.
- All absolute URLs derive from process.env.APP_URL; robots/meta indexing obeys
  SEO_INDEXING. Never hardcode the deployment hostname anywhere.
- Keep Playwright smoke green: home renders, roadmap opens, drawer works, progress
  persists.

## Guardrails
- Never commit secrets; env via .env (see .env.example). Never store or log user API
  keys — memory only; verify error-monitoring scrubbing.
- Never copy content, images, or JSON from roadmap.sh or its repo (restrictive
  license — docs/01 §4). All content comes from /pipeline or hand-written samples.
- Sanitize model-generated HTML (rehype-sanitize) before storing.
- Don't run pipeline with --publish against prod without asking me.

## Definition of done (any task)
typecheck ✓ · tests ✓ · mobile viewport checked for UI work · doc section referenced
in the PR/commit description.
```

---

## Prompts that work well per phase (adapt)

- Kickoff: "Read docs/README.md then docs/08 Phase N. Propose a step-by-step plan with
  file paths. Wait for my approval."
- Canvas work: "Implement the React Flow viewer per docs/03 §3.2 and docs/04 §3.
  Use the sample seed roadmap. Add a Playwright test that clicks node 'a' and asserts
  the drawer title."
- AI work: "Implement /api/ai/roadmap per docs/06 §3.6 and docs/05 §4. Mock the
  provider registry in tests; include the repair-pass path in a unit test."
- Review: "Audit Phase N against its checklist in docs/08; list gaps; fix the top 3."

## Launch checklist (before sharing publicly)

pathgrid.dev/.app domain + @pathgrid handles secured · terms/privacy/Impressum pages (if hosting a shared
instance) · analytics live · error monitoring with key-scrubbing verified · BYOK flow
tested end-to-end against all four providers · 20 roadmaps published · OG images
render · Lighthouse ≥90 on home + one roadmap · backup/restore tested on Neon ·
self-host README verified on a clean machine.
