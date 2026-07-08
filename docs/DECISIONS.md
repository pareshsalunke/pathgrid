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

