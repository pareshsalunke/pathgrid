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
