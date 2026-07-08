# 07 — Design Brief (for Claude Design)

Brief for designing Pathgrid, an AI-native interactive learning-roadmap platform.
Reference product category: developer-education sites with dark, card-grid catalogs and
flowchart-style learning canvases. **Take inspiration from the category's patterns; do
not replicate roadmap.sh's branding, logo, exact palette, or copy.** The identity must
be original.

---

## 1. Product & audience

One-liner: *"Visual learning paths for any tech skill — generated for you, tracked by
you."* Audience: developers and career-changers, 20–40, dark-mode natives, allergic to
marketing fluff. The brand should feel like a precise instrument, not a bootcamp ad:
calm, technical, quietly confident.

**The name:** *Pathgrid* = the learning **path**, drawn on the canvas **grid**. Use this
literally in the identity: the logo mark should suggest a route across a grid — e.g., a
polyline connecting 3–4 nodes on a subtle dot- or line-grid, reducible to a favicon.
Grid texture (faint dots/lines) is a legitimate background motif on hero and empty
states — used sparingly. Wordmark: lowercase "pathgrid" in the display face works well;
never "PathGrid" or "Path Grid" — one word, one capital only at sentence start.

## 2. Design principles

1. **The map is the product.** Every visual decision serves graph legibility: chrome
   recedes, canvas and cards carry the content.
2. **Two worlds, one system:** dark "chrome" (navigation, catalog, AI hub) framing a
   **light canvas** for roadmaps — the deliberate inversion makes the map feel like a
   document you own and keeps node-state colors readable. This contrast is the signature
   move; design it intentionally.
3. **Progress is emotional.** Done/learning/skipped states, progress bars, and streaks
   are the retention surface — make state changes satisfying (checkmark tick, bar fill)
   without being gamified-cute.
4. **AI presence is ambient, not gimmicky.** No sparkle-emoji-everywhere. AI entry
   points look like calm tools (an input, a button) with visible token/cost readouts
   and the active provider shown as a quiet chip — never hidden, never nagging.

## 3. Starting token proposal (Claude Design may improve on this — keep contrast ratios)

**Color**
- `bg/base` #0B1020 (near-black navy) · `bg/raised` #111931 · `border/subtle` #22304D
- `text/primary` #E8EDF7 · `text/secondary` #93A0B8
- `brand/primary` #5B7CFF (indigo-blue — buttons, links, focus)
- `brand/gradient` for display headlines: #7C5CFF → #C46BFF (violet→orchid)
- Canvas world: `canvas/bg` #F7F5EF (warm paper) · `node/topic` #FFD84D fill /
  #1A1A1A text · `node/subtopic` #FFF3C2 · `node/label` transparent w/ #6B7280 text ·
  edges #2A2F3A, dashed for optional
- State colors on canvas: done #22A06B (fill shift + check), learning #5B7CFF ring,
  skipped 45% opacity + strikethrough label
- Semantic: success #2FBF71 · warning #E9A23B · danger #E5484D

**Type**
- Display: a characterful grotesk with personality (e.g., Space Grotesk or General Sans)
  — used only for H1/hero and section chips.
- Body/UI: Inter (or Geist). Mono (code, meters): JetBrains Mono.
- Scale: 12/14/16/18/22/28/40/56; weights 400/500/650.

**Shape & depth:** radius 10px cards / 8px controls / full pills for CTAs; 1px borders
over shadows in dark chrome; canvas nodes get a 2px border + soft shadow (paper-on-desk).

**Motion:** 150–200ms ease-out; drawer slides with slight canvas dim; node status change
animates fill + check draw-in; respect `prefers-reduced-motion`.

## 4. Component inventory (design these as a system first)

Header w/ dropdown menus (icon + title + subtitle rows) · roadmap card (title, bookmark
toggle, "New" badge) · section divider chip · buttons (primary pill, secondary ghost,
destructive) · progress bar + % chip · canvas node set (title/topic/subtopic/label ×
4 states) · edge styles (solid/dashed) · canvas controls (zoom, fit, legend) · topic
drawer (header w/ status selector segmented control, body, resource rows with type
badges, AI action row) · chat bubble pair + streaming indicator + provider/model chip + session token counter ·
generation progress stepper · form inputs + level selector · API-key form (masked input,
"Test key" button, idle/checking/valid/invalid states) · provider & model selectors ·
dashboard "continue" card · empty states (catalog, library, chat) · toast · auth card ·
footer w/ newsletter field.

## 5. Screen briefs (design in this order)

1. **Home** — hero (display gradient headline, one-line sub, two CTAs), "Role paths"
   grid (3-col), "Skill paths" grid, wide "Generate your own" AI banner card with an
   inline input, changelog teaser + newsletter, footer. Density: catalog-first; hero
   ≤ 40vh.
2. **Roadmap page** (the money screen) — dark header strip (breadcrumb, H1, description,
   progress bar, actions), then the light canvas viewport with a small legend, drawer
   open state on the right (show one resource list + status selector), long-form SEO
   section + FAQ accordion below, related-paths row. Show desktop + mobile
   (bottom-sheet drawer + "list view" toggle).
3. **AI hub** — left rail (create tabs, My Learning, provider/model chip + session
   token counter), main pane in three
   states: empty, generating (stepper: outline → graph → layout), result (mini canvas +
   save/regenerate). 
4. **Tutor chat** — thread list, chat pane grounded to a roadmap (context chip at top),
   streaming state, missing-key state (friendly card linking to Settings).
5. **Dashboard** — continue-learning cards, bookmarks grid, AI library with type badges.
6. **Settings** — profile block + AI Provider section: provider selector, masked key
   field with "Test key" states, smart/fast model pickers, plain-language privacy note
   ("your key stays in this browser"), clear-key action.
7. **Auth** — single card, OAuth buttons + magic-link field, reassurance line ("your
   progress on this device will be kept").
8. **Editor** (may be v2 of the design) — palette left, canvas center, properties right,
   AI-assist popover.

## 6. Voice & microcopy rules

Sentence case everywhere; verbs on buttons ("Generate roadmap", "Mark as done", never
"Submit"); readouts state facts ("1,842 tokens · ~$0.01 · Claude Sonnet"); empty states give one
action, not poetry; error states say what happened + the fix. No exclamation marks in UI
chrome. AI-generated content carries a quiet "AI-drafted · human-reviewed" footnote.

## 7. Accessibility & responsive floor

WCAG AA contrast in both worlds (check the yellow-node text especially); full
keyboard path: tab to nodes, Enter opens drawer, Esc closes and returns focus; canvas
has the linear list-view alternative; touch targets ≥44px; drawer traps focus; visible
focus rings (2px `brand/primary`).

## 8. Deliverables Claude Design should output

1. Token sheet (names + values as above, refined) exportable as JSON/CSS variables.
2. Component board covering §4 with states.
3. The 7 screens in §5, desktop 1440 + mobile 390 for screens 1–2.
4. A short "design rationale" note (Claude Code will read it as styling context).

Save everything into the repo at `/docs/design/` (tokens as `tokens.json`, screens as
PNG + any generated code snippets) before starting Claude Code Phase 1.
