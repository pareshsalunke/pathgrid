# Decisions & drift log

Deviations from the spec pack (docs 01–08), with the reason for each. Update this
file whenever the build diverges from what a doc states.

## Stack drift (Phase 0 scaffold — 2026-07-08)

| Area | Spec says | Built with | Why |
|---|---|---|---|
| Framework | Next.js 15 (docs 05/08) | **Next.js 16.2.10** | `create-next-app@latest` installs 16; App Router API used here is unchanged from 15. No 15-only pattern relied on (see below). |
| Styling | Tailwind v4 (unversioned) | **Tailwind 4.3.2** | Latest v4; CSS-first `@theme` config, which is how tokens are wired. |
| React | (implied 19 via Next 15) | **React 19.2.4** | Bundled with Next 16; required baseline. |
| Runtime | (unspecified) | **Node 22 (v22.22.2)** | pnpm 11 requires Node ≥ 22.13; pinned via `.nvmrc` + `engines.node >=22` so local and Vercel match. Homebrew `node@20` was relinked → `node@22`, and `.zshrc` PATH updated. |
| Package mgr | pnpm (docs 05/08) | **pnpm 11.10.0** (corepack) | Corepack default on Node 22. |
| UI primitives | shadcn/ui | **shadcn CLI 4.13 (base-ui / "nova")** | Current shadcn defaults to the base-ui component library; `components.json` written, tokens drive its theme via `globals.css`. |

## Next 15 → 16 compatibility check

Confirmed nothing in the Phase 0 implementation depends on a Next-15 behaviour that
changed in 16:

- **Async request APIs** (`params`, `searchParams`, `cookies()`, `headers()`): became
  Promise-based in **15**, unchanged in 16. Phase 0 uses none of them — the home page
  and root layout read no dynamic request state.
- **Caching defaults**: `fetch` and GET route handlers are uncached-by-default since 15;
  16 keeps this. Phase 0 issues no `fetch` calls and defines no route handlers, so there
  is no caching assumption to break.
- **Metadata API** (`metadata`, `metadataBase`, `robots`): stable across 15 and 16 — used
  for the `noindex` gating and canonical base URL.
- **Turbopack**: default in 16 for `dev`/`build`. No custom webpack config exists to be
  incompatible.

Re-verify this section when Phase 1 adds `generateStaticParams`, route handlers, and
`fetch`-based data loading.

## Design & scope deviations (Phase 0)

- **No dark theme default.** docs/08 Phase 0 lists "dark theme default", but
  [docs/design/rationale.md](design/rationale.md) overrides it: pathgrid is a light
  black-on-white editorial frame, and the *only* dark surface is the roadmap canvas
  (handled locally in Phase 1). So the app ships light by default with no global `.dark`
  inversion — a conscious deviation, not an oversight.

- **Phase 0 e2e smoke is intentionally minimal.** docs/08 describes the full smoke as
  "open roadmap → click node → drawer → mark done → reload → still done", but those
  features don't exist until Phase 1. The Phase 0 Playwright test therefore only asserts
  "home renders" (hero + primary CTA visible, no horizontal overflow at 390px). The full
  smoke lands with the roadmap canvas in Phase 1.

## Design & scope decisions (Phase 1)

- **Graph schema = docs/04 §3 (authoritative).** The `roadmap_versions.graph` shape is the
  React-Flow-native one in §3 (`node {id,type,position?,data:{label,slug?,order?,optional?},
  parentId?}`, `edge {id,source,target,data:{style,kind}}`). The `{title,x,y}` shape in doc 06
  is only the pipeline's pre-layout intermediate — Zod validates against §3
  ([src/lib/schemas/graph.ts](../src/lib/schemas/graph.ts)).

- **Markdown → sanitized HTML at render (RSC), not stored.** `topics.body_md` is the only
  stored column — no `body_html`. The roadmap page renders it server-side through a `unified`
  + `rehype-sanitize` pipeline ([src/lib/markdown.ts](../src/lib/markdown.ts)) and passes HTML
  as props. Keeps the doc-04 schema intact, ships no markdown parser to the client (doc 05),
  and satisfies the "sanitize model HTML" guardrail.

- **Roadmap data passed as props from the SSG page — no API routes yet.** Per doc 05, the
  canvas gets the graph + pre-rendered topic payloads as props (no second fetch). The doc-04
  `/api/roadmaps/*` route handlers arrive with the client/AI features in Phase 2/3.

- **elkjs layout runs server-side at SSG.** `layoutGraph()` computes positions in the RSC so
  the canvas receives positioned nodes as props (no client-side layout flash). Sample graphs
  are authored position-less.

- **Progress is localStorage + Zustand only (per-device).** No `user_topic_progress` /
  `bookmarks` tables or progress API this phase; the bookmark icon is non-functional.
  Cross-device sync is deliberately Phase 2 (server progress + `POST /api/progress/merge`
  folds anonymous localStorage into the account on first login). The store
  ([src/lib/stores/progress.ts](../src/lib/stores/progress.ts)) is the optimistic cache Phase 2
  keeps in front of the server. (Confirmed with the user.)

- **Two sample roadmaps seeded** (`frontend-developer`, `typescript`) so the home grids and
  the canvas have real data; the full catalog is Phase 4.

## Design & scope decisions (Phase 2)

- **SSG preserved despite auth.** The root layout does **not** call `auth()` — instead
  `SessionProvider` ([src/app/providers.tsx](../src/app/providers.tsx)) fetches the session
  client-side, so `/` and `/[roadmapSlug]` stay static. Only `/dashboard`, `/settings`, `/login`
  are dynamic (they read `auth()`/`searchParams`). Bookmark state and progress hydration are
  fetched client-side for the same reason.
- **Auth.js v5, database sessions, Drizzle adapter** (Google + GitHub + Resend magic link).
  Pages protected by `await auth()` + `redirect()` — no middleware (keeps neon-http off the edge).
- **`users.avatar_url` kept (unused).** Dropping it while adding `image` made drizzle-kit prompt
  "rename vs drop" interactively (fails in non-TTY). Keeping the legacy column avoids the prompt;
  the adapter writes `image`.
- **Account delete = one `DELETE users`** relying on FK `ON DELETE CASCADE` (progress, bookmarks,
  accounts, sessions, owned roadmaps). neon-http has no multi-statement transactions.
- **Merge policy**: rank `pending < skipped < learning < done`; higher wins so "done" is never
  downgraded ([mergeStatuses](../src/lib/db/progress.ts)).
- **OAuth e2e not automated** (real provider login). Server persistence + merge are proven by a
  Neon integration test ([progress-db.test.ts](../src/lib/db/progress-db.test.ts)); the OAuth
  round-trip is verified manually once the user pastes credentials.
- **Settings ships Profile + Account only.** The AI Provider / API-keys section is Phase 3.

## Design & scope decisions (Phase 3 — AI runtime, BYOK; item 1)

- **BYOK transport carries both tier models.** docs/04 §4 names a single `x-ai-model`
  header, but runtime generation needs two tiers (docs/05 §4: `smart` for graphs/content/
  chat, `fast` for quizzes + the JSON repair pass). Contract is therefore `x-ai-provider`
  + `x-ai-model-smart` + `x-ai-model-fast` + `Authorization: Bearer <key>`
  ([src/lib/ai/headers.ts](../src/lib/ai/headers.ts), shared client+server);
  `resolveProviderConfig` ([registry.ts](../src/lib/ai/registry.ts)) returns
  `{error:"no_provider_key"}` when any part is absent.
- **User keys live only in the browser.** localStorage via `useAIProvider`
  ([src/lib/stores/ai-provider.ts](../src/lib/stores/ai-provider.ts), persist key
  `pathgrid-ai`); forwarded per request in the Authorization header, used in memory only
  server-side — never written to the DB or logs, never passed to `track()` (docs/05 §4).
- **Vercel AI SDK v7 + `@ai-sdk/{anthropic,openai,google}` v4.** `getModel` instantiates a
  fresh provider client per request with the caller's key. OpenRouter reuses the OpenAI
  provider with `baseURL: https://openrouter.ai/api/v1` — no extra dep (docs/05 §4).
- **Model catalog = seeds + free-text override.** Small static list per provider
  ([catalog.ts](../src/lib/ai/catalog.ts)); Anthropic ids from the claude-api reference,
  others seeded with conservative stable ids. The Settings picker offers a "Custom…" option
  so new models never need a code change (docs/05 §4).
- **Registry core + Test-key only this item.** The structured-output helper (generate→Zod→
  one repair) and `events` token logging (docs/05 §4) are deferred to the first generation
  route (#3), where they can be exercised and unit-tested. `AI_DISABLED=1` kill switch added
  ([env.ts](../src/lib/env.ts)); `POST /api/ai/test-key` validates a key via a 1-token call
  on the fast model and maps provider errors → actionable messages.
- **AI-provider section tested by component test, not authed e2e.** The section is on the
  auth-gated `/settings` and the Playwright suite has no auth fixture, so internals (pills,
  key field, Show/Hide, Custom override, Test-key states) are covered by a Vitest + Testing
  Library test ([AIProviderSection.test.tsx](../src/app/settings/AIProviderSection.test.tsx));
  e2e adds only the signed-out `/settings → /login` redirect.
- **`docs/PROGRESS.md` is gitignored** — a local handoff/bridge file, not versioned.

### Item 3 — `POST /api/ai/roadmap` (two-pass generation)

- **Outline prompt returns a `title`** (docs/06 §3.1 adapted — templates are "adapt
  freely"): `graph.meta.title` needs a real name and the outline pass is where naming
  belongs. Graphify returns **nodes+edges only**; `meta` is built **deterministically
  server-side** (title from outline, `level` mapped `intermediate→mixed` to fit the
  doc-04 §3 enum, `estHours = hoursPerWeek × 12` per §3.6) — never trusted from the model.
- **Positioned graph stored.** For generated roadmaps, `layoutGraph` runs at generation
  time and positions are saved in `roadmap_versions.graph` (schema allows optional
  positions). Official seeded roadmaps still lay out at SSG render — no change there.
  elk-only `width`/`height` fields are stripped before save (derived from `NODE_SIZE`).
- **Structured-output helper** ([structured.ts](../src/lib/ai/structured.ts)): generate →
  strip code fences → JSON.parse → Zod → ONE repair call on the **fast tier** (docs/05 §4)
  with the issues pasted in → `StructuredOutputError`. Errors carry Zod issue paths only,
  never raw model output (nothing model-generated is logged).
- **`ai_call` event props are camelCase** (`inTokens`/`outTokens`/`latencyMs`) — matches
  existing events codebase-wide; doc 04 §2's `in_tokens` naming noted as drift.
- **Graph-only generation** (docs/06 §3.6): no per-topic `topics` rows for generated
  maps — drawer content arrives on demand via the tutor (items 4/5). Only the
  `generated_items` table added now (migration 0003, additive); `chat_*`/`quizzes`/
  `guides` land with items 5/6.
- **SSE protocol**: data-only events `{type:"progress",step}` →
  `{type:"done",roadmapId,title,usage}` | `{type:"error",code,message}`;
  `maxDuration = 300`. Errors after the stream opens ride as SSE `error` events
  (HTTP status already committed).

### Item 4 — `/ai` hub + `/ai/roadmap/[id]` viewer

- **[Save to library] button dropped** (AI Hub.dc.html shows one): the route already
  auto-saves before `done` (docs/08 item 3), so the result pane shows "saved to your
  library" + [Regenerate] + [Open full map] instead. Cancel mid-generation only aborts
  the client fetch — the server finishes and saves (design copy embraces this).
- **`done` event carries the positioned graph** so the hub previews with zero extra
  round-trips.
- **Course plan / Quiz modes are coming-soon states** (APIs are items 5/6); the rail +
  copy match the design so the IA is already in place.
- **Viewer synthesizes label-only drawer topics** (empty body/resources) — generated
  maps have no `topics` rows; the drawer degrades per its existing empty-body behavior.
  Bodies arrive with the tutor (item 5). Viewer uses stored positions — no elk pass.
- **Login gained `callbackUrl` support** (relative-paths-only validation against open
  redirects; default `/dashboard`) so gated AI actions return the user to `/ai`.
- **`NODE_SIZE`/`PositionedNode` moved to `src/lib/node-size.ts`** (layout.ts
  re-exports). Lesson: layout.ts instantiates elkjs at module scope, so a **value**
  import from a client component silently shipped ~1.4MB of elk to the `/ai` bundle
  and could stall hydration; Phase-1 components only ever `import type` from it.
  Rule: client code imports canvas dims from `lib/node-size`, never `lib/layout`.
- **Session token counter is in-memory only** (`useAiSession`, no persist) — "this
  session" is literal; cost estimate from a tiny static price table
  ([pricing.ts](../src/lib/ai/pricing.ts)), tokens-only for unknown/override models.

### Item 5 — `POST /api/ai/chat` + tutor chat (`/ai/chat`)

Schema (migration 0004, additive — deviations from the doc-04 §2 DDL sketch):

- **`chat_messages.role` is a pgEnum** (`chat_role`), not `text` — follows the
  `generated_kind`/`progress_status` precedent; invalid roles fail at the DB.
- **`chat_threads.roadmap_id` is `ON DELETE SET NULL`** (doc default would be NO
  ACTION). Required, not stylistic: with NO ACTION, deleting a roadmap owner's account
  (`DELETE FROM users`, the GDPR path) fails whenever one of their roadmaps grounds
  someone else's thread. SET NULL degrades such threads to the general tutor.
- **`chat_threads.summary` + `summary_upto` added** (extension of the doc sketch):
  rolling summary of turns older than the ~20-message context window (doc 05 §4
  "cap history; summarize older turns"), regenerated on the fast tier with hysteresis;
  `summary_upto` = last `chat_messages.id` folded in.
- **`tokens` split across roles**: user rows store that turn's `inputTokens`, assistant
  rows its `outputTokens` — `SUM(tokens)` per thread = what the user actually paid, and
  the split keeps a priced per-thread readout possible (input/output rates differ).
- **Indexes on `chat_messages(thread_id, id)` and `chat_threads(user_id)`** — first
  hot ORDER BY path in the app (last-20-by-thread every turn).

Route + UI:

- **Canonical route is `/ai/chat` + `/ai/chat/[threadId]`** (docs/03 §2); the header/
  drawer `/tutor` stubs were rewired (a `/tutor` page never existed — no redirect).
  Pages are auth-gated RSCs (viewer precedent, `noindex`) loading rail/messages via
  repos — no extra GET APIs.
- **SSE contract**: pre-stream failures are plain JSON (401/503/`no_provider_key`/
  `invalid_body`/404 thread/404 roadmap — the client's `!res.ok` branch stays
  reusable); once streaming, `{type:"meta",threadId,title}` → `{type:"delta",text}`… →
  `{type:"done",usage}` | `{type:"error",code,message}`. On a new thread's meta the
  client swaps the URL with **`history.replaceState`** (Next 16 syncs it into router
  state — `router.replace`/`refresh` would remount mid-stream); the rail is client
  state seeded from the server.
- **ai@7 `streamText` error routing** (first use in the codebase): provider failures
  surface as stream error parts which `textStream` silently drops, and `result.usage`
  then rejects with a generic `NoOutputGeneratedError` — so [tutor.ts](../src/lib/ai/tutor.ts)
  captures the original via `onError` and rethrows it, keeping `mapProviderError`
  status-code mapping intact.
- **Rolling summary runs via `next/server` `after()`** (fires once the SSE stream
  closes, `waitUntil`-backed) so it never delays a reply; the closure briefly holds
  the caller's key past response close — same invocation, still memory-only, within
  the doc-05 §4 contract. Trigger: ≥10 messages outside summary+window, fast tier,
  logged as `ai_call {feature:"chat_summary"}`. Turn calls log `{feature:"chat"}`.
- **Disconnect-safe streaming**: client aborts only stop the sending (`cancel()` flag
  + guarded enqueue); the server finishes the turn and persists both rows — leaving
  mid-answer means the reply is in the thread (roadmap-route parity).
- **`getRoadmapForChat` access rule = owner OR `public`/`unlisted`** — unlisted is
  already link-shareable via its slug page, so grounding chat on it is consistent;
  `getRoadmapById` stays owner-only for the viewer.
- **Bubbles render plain text v1** (`whitespace-pre-wrap`): `renderMarkdown` is
  server-side by design (doc 05 — no client markdown parser) and streaming markdown
  would need one; the persona instructs plain text. Markdown rendering is a follow-up.
- **Context switching is minimal v1 (user-decided)**: the chip shows the thread's
  roadmap (or "General tutor") and "Change" links to the roadmap page; switching =
  start a new chat from a roadmap surface. **Node-citation chips skipped
  (user-decided)** — the persona cites nodes in plain text; structured citations later.
- **`?q=` prefills the composer and never auto-sends** — BYOK spend stays an explicit
  click (drawer "Explain this topic" deep-links with `?q=Explain this topic`).
- **`maxDuration = 300` kept uniform** with `/api/ai/roadmap` (slow-provider headroom;
  costs nothing when idle).

### Item 6 — quiz (`POST /api/ai/quiz` + drawer flow + `POST /api/quiz-attempts`)

Schema (migration 0005, additive — deviations from the doc-04 §2 DDL sketch):

- **`quizzes` is keyed by `(roadmap_id, node_id)`, not the doc's `topic_id` FK.**
  Forced by the code, not preference: `DrawerTopic` only ever carries a graph `nodeId`
  (never the `topics` uuid), and **generated maps have no `topics` rows at all** (the
  `/ai/roadmap/[id]` viewer synthesises label-only topics). `(roadmap_id, node_id)` is
  the one addressing that exists on both official and generated surfaces, and it mirrors
  how `user_topic_progress` / `chat_threads` already address content. A `UNIQUE
  (roadmap_id, node_id)` is the cache key; `upsertQuiz` uses `onConflictDoUpdate` so a
  two-tab race (or a future explicit regenerate) is idempotent. `model` stores authoring
  provenance (doc 06 §4.5).
- **Both `quiz_attempts` FKs are `ON DELETE CASCADE`** (doc sketch left `quiz_id` bare):
  `user_id` cascade is the GDPR path; `quiz_id` cascade means deleting a roadmap (which
  cascades its quizzes) can't orphan an attempt. Net effect proven by the Neon test —
  delete a user ⇒ only their attempts go (a foreign quiz survives); delete a roadmap ⇒
  its quizzes and their attempts both go.

Route + UI:

- **Plain JSON, not SSE** (unlike the roadmap/chat routes). A quiz is a single
  fast-tier `generateStructured` call with a small payload, so streaming buys nothing;
  errors are ordinary status codes (`422 generation_invalid`, `502` mapped-provider,
  `404` roadmap/topic) which the client's `!res.ok` branch already handles.
- **Fast tier for generation *and* repair** (doc 05 tier table: quiz = fast) — cheapest
  path on the user's key.
- **Answers are withheld until grading.** `POST /api/ai/quiz` returns only
  `{q, options}` (`toPublicQuestions` strips `answerIdx`/`why`); `POST /api/quiz-attempts`
  grades server-side and *then* reveals `answerIdx`/`why` for the review screen — matches
  doc 04 §4 ("Grade + store attempt") and keeps answers out of the client bundle. The
  attempts route is **session-gated only** (no BYOK key — it makes no model call).
- **Model output is a `{questions:[…]}` wrapper** (doc 06 §3.5); Zod `quizGeneration`
  validates the wrapper, the bare `quizQuestions` array is what's stored. **Question count
  accepted as 4–6** though the prompt asks for exactly 5 (2 recall / 2 application / 1
  tricky) — a slightly over/under-count return renders fine instead of forcing a paid
  repair or a hard fail on the user's key.
- **"Quiz me" runs inline in the drawer**, not a deep-link (doc 08 says "flow", doc 03
  §3.2 lists it as a drawer AI-row action). `QuizPanel` overlays the drawer body on
  **both** official (`/[roadmapSlug]`) and generated (`/ai/roadmap/[id]`) maps via the
  shared `TopicDrawer`; gating mirrors `CreateRoadmapPane` (anon → login CTA / no-key →
  connect-key → Settings). For generated maps (no `body_md`) the route falls back to the
  node label + standard-curriculum instruction — the same label-only unlock as item-5
  chat. The session token meter counts a real generation only; a **cache hit is free**
  (no model call, no `ai_call` event).
- **`/ai` hub Quiz tab stays `ComingSoonPane`** (deliberate non-goal): item 6's checklist
  is route + drawer flow + grading; a hub tab needs a roadmap/topic picker that doesn't
  exist. Same call item 5 made for chat. `POST /api/quiz-attempts` fires a
  `quiz_attempt` analytics event; `POST /api/ai/quiz` logs `ai_call {feature:"quiz"}`.

### Item 7 — generation lock + provider-error polish + `/admin/ai` usage table

Item 7 closes Phase 3. Three of its four sub-parts were already scaffolded (items 1–6),
so the new build is the generation lock + the admin surface; the rest is an audit.

- **Generation lock = a server-side DB lock** (docs/05 §4 "a lock so one user can't run
  parallel generations"), not client-only. New `generation_locks` table (migration 0006,
  additive: `user_id` PK → `users` cascade, `kind`, `started_at`). Acquisition is **one
  atomic upsert** — neon-http has no session advisory locks or multi-statement
  transactions — via `onConflictDoUpdate` with a **`setWhere` staleness guard**
  ([generation-lock.ts](../src/lib/db/generation-lock.ts)): no row → insert → acquired;
  row older than the **5-minute TTL** (just over the roadmap route's `maxDuration=300`) →
  takeover (a crashed generation self-heals); an active row → `setWhere` false → 0 rows →
  `.returning()` empty → refused. **Only `POST /api/ai/roadmap` is locked** (chat/quiz are
  quick); it acquires before opening the SSE stream (pre-stream `409 generation_in_progress`,
  consistent with the 401/503/400 guards) and releases in the stream's `finally`. The
  per-tab button-disable stays; the lock adds cross-tab / cross-device / direct-API cover.
- **`/admin/ai` admin gate = an env email allowlist** (`ADMIN_EMAILS`,
  [env.ts](../src/lib/env.ts) → [admin.ts](../src/lib/admin.ts) `isAdmin`), not a
  `users.role` column — no migration, no promotion path, fits the solo / self-host
  operator model. Non-admins get **`notFound()` (404), not a redirect**, so the page's
  existence isn't revealed; signed-out → `/login?callbackUrl=/admin/ai`. This reconciles
  with doc 02's "no admin reporting" non-goal: that non-goal is **B2B/team** reporting —
  `/admin/ai` (doc 08 Phase 3) is the operator's own usage view, not a user-facing feature.
- **Usage table = tokens/day per feature over a 30-day window** (doc 08 wording),
  aggregating `events WHERE name='ai_call'` ([db/admin.ts](../src/lib/db/admin.ts),
  raw `sql` — `make_interval(days => n)`, group by the `to_char`/`props->>'feature'`
  aliases, `count(*) filter (where props->>'ok' = 'false')` for failures). **No cost
  column** — per-action/session cost already lives in the hub (`pricing.ts`), and a
  per-feature aggregate loses the model granularity a price needs. **No key can surface**
  (keys never reach `props`). **No design export exists** for an ops page → it follows the
  `settings/page.tsx` editorial frame (theme vars only); dynamic via `auth()` (leaves
  `/` + `/[roadmapSlug]` SSG untouched); `noindex`. No nav link — admins type the URL.
- **Kill-switch + provider-error mapping were verification, not new code.** All four AI
  routes already return `503 ai_disabled` (`test-key` gained the missing route test:
  401/503/400) and all four client surfaces already render `mapProviderError`'s actionable
  `message` (roadmap/chat SSE `event.message`; quiz/test-key JSON `data.message`). The one
  new string is the `409` copy in `CreateRoadmapPane`.

## Design & scope decisions (Phase 4 — content pipeline & real catalog)

- **Launch niche = a PM/leadership wedge, not the dev catalog** (resolves doc 02's open
  question; user decision 2026-07-09). `pipeline/catalog.ts` seeds 6 roadmaps:
  `product-manager` · `technical-product-manager` · `ai-product-manager` ·
  `system-design` · `leadership-high-performance-teams` · `pm-behavioral-interviews`.
  The doc 06 §3.1 outline persona is generalized from "self-taught developers" to
  self-directed *professionals* accordingly (templates are "adapt freely").
- **catalog.yaml → typed `pipeline/catalog.ts`.** No YAML parser dep, typechecked
  entries, and the CLI validates `--slug` against it with a helpful error.
- **`server-only` under tsx → `node --conditions=react-server`** (the `pipeline`
  script). Verified: only `server-only` ships a `react-server` export condition
  (→ `empty.js`); `ai`/`@ai-sdk/*` don't, so nothing else resolves differently. The
  pipeline therefore reuses the runtime AI core (`generateStructured`,
  `graphifyPrompts`+schema, `validateGraph`, `layoutGraph`, `generateQuiz`,
  `upsertQuiz`) with zero refactor and all client-import guards intact.
- **Draft status = `visibility:'unlisted'`** — no new status column, **no migration**.
  `getRoadmapBySlug` doesn't filter visibility and `/[roadmapSlug]` allows dynamic
  params, so drafts render **on the real page** for review while staying off home +
  sitemap (both filter `public`). `publishRoadmap` flips to public; **re-seeding never
  touches visibility** (the doc 06 §4.4 freshness path can't silently unpublish).
  Draft pages emit `robots: noindex` (belt for post-launch, when SEO_INDEXING is on).
- **Provenance without a migration** (doc 06 §4.5): `topics.meta.generatedBy
  {model, promptVersion, date}` (jsonb extension of `topicMeta`), `quizzes.model`
  (already stored), `roadmaps.isAiGenerated` → the roadmap page renders an
  "AI-drafted, human-reviewed" footer line.
- **Provider Batch APIs → a 4-wide concurrency pool** (`src/lib/pipeline/pool.ts`).
  The ~50% batch discount isn't worth a bespoke batch integration for a 6-roadmap
  catalog (~$1–3/roadmap at Sonnet+Haiku rates); per-topic incremental writes make the
  steps resumable so retries are cheap. Revisit if the catalog grows 10×.
- **Resource policy A (verified links; user decision)**: the model suggests ≤2 free
  resources per topic (prompted to skip rather than guess), `verifyUrl` HEAD-checks
  (GET fallback on 403/405/501), failures are **dropped** — `resources.status` is
  always `'verified'` for pipeline rows; nothing `unverified` ships (doc 06 §2).
- **Review gate = `/admin/pipeline` (real page; user decision)** — same `isAdmin` env
  allowlist + 404 as `/admin/ai`. Lists unlisted drafts (from DB, works deployed) with
  critique-pass findings (best-effort fs read of `pipeline/out/<slug>/critique.json` —
  local-only) + the doc 06 §4.3 checklist; the draft itself is reviewed on `/[slug]`.
  Critique runs on the **fast tier** (doc 06 §4.2 "cheap model").
- **`assertOfficialSize` enforced in the graph step** (doc 04 §3's 15–80 content-node
  bar) — pipeline output only; small samples/tests keep validating.
- **estHours = the content pass's own sum**: `graph.meta.estHours` is provisional at
  graphify time and recomputed at seed-draft as `round(Σ est_hours)` — the runtime
  generator keeps its `hoursPerWeek × 12` formula (different input contract).
- **Publish + ISR**: `POST /api/revalidate` (new), gated by `REVALIDATE_SECRET`
  (timing-safe compare; 503 when unset) → revalidates `/`, `/${slug}`, `/sitemap.xml`.
  `src/app/sitemap.ts` (new) lists public slugs only. The publish step confirms
  interactively (or `--yes`) because the DB is shared local+prod, then calls
  revalidate best-effort (`REVALIDATE_URL` ?? `APP_URL`).
- **`pipeline/out/` is gitignored** — intermediate JSON is a local working artifact;
  the DB is the source of truth after seed-draft.

## Design & scope decisions (Phase 5 — editor `/editor/[id]`, item 1)

- **Autosave updates the current version's graph IN PLACE** (`updateRoadmapGraph`
  in [editor.ts](../src/lib/db/editor.ts): `UPDATE roadmap_versions SET graph WHERE
  id = currentVersionId` + touch `roadmaps.updated_at`), **not** a new version per
  save — a debounced editor would otherwise explode `roadmap_versions`. Versioning
  stays a pipeline/publish concern (`upsertDraftRoadmap` appends; the editor mutates).
  **No migration** — reuses `roadmap_versions.graph` + the `visibility` enum + existing
  columns.
- **Separate `EditorCanvas`, not an `editable` prop on `RoadmapCanvas`.** The read-only
  canvas backs the **public SSG `/[roadmapSlug]`** page and must not absorb editor
  bundle/hydration risk; the editor needs mutable RF state (`useNodesState`-style +
  change handlers) vs the viewer's derived `useMemo`. Reuses `nodeTypes`/`CanvasControls`/
  `Legend`/`NODE_SIZE`. A fresh `EditorScreen` (not `RoadmapView`, which wires
  progress-sync + drawer + list).
- **RF `data` is fattened to carry `slug`/`order`/`parentId`** (`EditorNodeData` in
  [graph-ops.ts](../src/lib/editor/graph-ops.ts)). `RoadmapCanvas` drops these from RF
  `data`; reusing that shape and serializing "keep data" would silently lose the slug →
  topic/subtopic fail `roadmapGraph.superRefine`. The reused `RoadmapNode` only reads
  label/variant/optional, so the extra fields are inert. **`parentId` stays FLAT** — never
  set as an RF `parentId` (RF makes positions parent-relative + demands parent-before-child
  ordering; elk positions are absolute), it round-trips only through `data.parentId`.
- **Graph invariants held BY CONSTRUCTION**, so autosave rarely blocks: `addNode`
  auto-edges the new node from the selected/title node (stays connected) and auto-slugs
  topics/subtopics; the title node is non-deletable + non-retypeable (palette offers no
  title); `deleteNode` **heals** connectivity by relinking former neighbours to a shared
  anchor with dashed `related` edges (which can't form a `sequence` cycle); ids via
  `crypto.randomUUID()`. Slugs are generated **once and kept stable** across renames
  (superRefine needs non-empty, not unique).
- **Autosave is a single-in-flight scheduler, NOT the progress-sync copy**
  ([use-autosave.ts](../src/lib/editor/use-autosave.ts)). A whole-graph PATCH is
  non-commutative, so out-of-order completion would clobber newer with older. The
  last-saved graph lives in **state** → "dirty" is derived during render, which makes the
  trailing save fall out for free (a save landing while edits are pending leaves it dirty →
  effect re-runs). An `inFlight` ref caps concurrency; every save is gated on client
  `validateGraph` (invalid transient → status `invalid`, holds); `beforeunload` guard when
  dirty. (This shape also satisfies the React-Compiler eslint rules: no ref access during
  render, no synchronous setState in an effect.)
- **Title has three homes**: the viewer H1 renders `roadmaps.title` (the column), while the
  graph carries `meta.title` + the title-node `data.label`. The inline title edit drives
  the title-node label (persisted by graph autosave, which mirrors `meta.title` in
  `serializeGraph`) AND debounces a `PATCH {title}` to sync `roadmaps.title`. So the
  editor PATCH body is `{ graph?, visibility?, title? }` (each optional, ≥1 required) —
  doc 04 §4 named only the graph; title/visibility are the same owner-gated resource.
- **Share-by-link = private↔unlisted only** (never public — catalog/sitemap/official
  territory; the sitemap already filters to public). The viewer `/ai/roadmap/[id]` is
  **relaxed** from owner-only to serve owner **or** public/unlisted (incl. logged-out) via
  new `getViewableRoadmapById(id, viewerUserId|null)` (returns `isOwner`); a private map to
  a non-owner is `notFound()` — hiding existence rather than the old login redirect. Reuses
  the existing viewer over a new `/r/[id]`; robots `noindex` stays (user content, even when
  shared). **e2e updated**: the signed-out viewer now asserts **404**, not a `/login`
  redirect.
- **Properties panel edits graph node data only** (label/type/optional/delete). **AI-assist
  popover deferred** (Phase 5 item 2 — doc 03 §3.5 names it in the top bar, but doc 08's
  checklist splits it out): a disabled top-bar slot marks the seam. **Body_md/resources
  editing deferred** — generated maps have no `topics` rows; pairs with per-topic content
  work. Edge deletion is out of P1 (keyboard delete is off; nodes delete via the panel so
  the guards run).
- **Entry point** = an owner-only "Edit" button on `/ai/roadmap/[id]`. Dashboard/hub
  entry points are a later touch.

