# 02 — Product Spec (PRD): Pathgrid

*Pathgrid — AI-native interactive learning roadmaps: every skill as a visual path on
a grid you can track, generated on demand.*

---

## Problem statement

Self-directed learners drown in unstructured content: courses are one-size-fits-all,
blog posts are fragmented, and "what should I learn next?" has no clear answer. roadmap.sh
proved that visual, opinionated learning paths with progress tracking solve this — but its
content depends on slow community curation and covers a fixed catalog. An AI-native
version can generate and refresh paths on demand, personalized to a learner's goal, level,
and available time, at near-zero marginal content cost.

## Goals

1. A learner lands on any roadmap and understands the full path in under 60 seconds
   (canvas comprehension is the core value).
2. ≥40% of visitors who open a roadmap interact with at least one node (click, mark
   progress) in session one.
3. A signed-in user can generate a personalized roadmap from a free-text goal in <60s,
   with output quality that passes your own review bar ≥80% of the time.
4. Full content catalog (≥20 roadmaps with topic content and quizzes) producible by the
   AI pipeline in <1 day of wall-clock time and <$50 of API spend.
5. All AI features run on the user's own API key — OpenAI, Anthropic, Google Gemini,
   or OpenRouter — configured in Settings. The app carries zero inference cost per user
   and can be freely self-hosted or distributed.

## Non-goals (v1)

- **Monetization of any kind** — no payments, plans, meters, or pricing pages. This is
  a personal / freely distributable BYOK tool; users pay their model provider directly.
- **Team/B2B features** — removed from the roadmap entirely (no workspaces, seats,
  assignments, or admin reporting).
- **Native mobile apps** — responsive web only.
- **Hand-crafted courses / lesson packs** — requires editorial effort that contradicts
  the AI-first thesis.
- **Community submissions** (public custom roadmaps, project solution sharing,
  comments) — moderation cost; v1 is single-player.
- **Video content** — out of scope entirely.
- **Multi-language UI** — English only at launch (German next, given your market).

## Personas

- **P1 "The Switcher"** — career changer (e.g., analyst → data engineer). Needs a
  trustworthy end-to-end path, not another course marketplace. Primary persona.
- **P2 "The Upskiller"** — working developer adding a skill (e.g., backend dev learning
  Kubernetes). Wants a fast gap-map: skip what they know, drill what they don't.
- **P3 "The Explorer"** — student or hobbyist browsing what careers/skills exist.
  High traffic, low intent; converts via bookmarks and newsletter.

## User stories (prioritized)

**Viewing & progress**
- As a Switcher, I want to open a role roadmap and see the whole journey as a visual
  graph so that I can judge scope and sequence at a glance.
- As a Switcher, I want to click any topic and read a concise explanation with 3–6
  vetted resources so that I don't have to search the web myself.
- As an Upskiller, I want to mark topics done/in-progress/skipped so that the roadmap
  reflects *my* remaining work, with a visible % complete.
- As any user, I want my progress to survive reloads (and sync once I sign up) so that
  the roadmap becomes my long-lived tracker.

**AI generation**
- As an Upskiller, I want to describe my goal, current level, and weekly hours and get a
  personalized roadmap so that I skip beginner material I already know.
- As a Switcher, I want to chat with a tutor grounded in the roadmap I'm viewing so that
  answers use the same terminology and sequence as my path.
- As any user, I want to generate a quiz for a topic and get graded with explanations so
  that I can verify I actually learned it.

**Accounts & retention**
- As any user, I want to bookmark roadmaps and see a dashboard of my progress and
  generated items so that I have one place to return to.
- As an Explorer, I want to subscribe to updates so that I hear when new roadmaps ship.

## Requirements

### P0 — MVP (cannot ship without)

**R1. Roadmap catalog home**
- [ ] Grid of roadmap cards grouped in sections (Roles / Skills), each card: title,
      bookmark toggle, link.
- [ ] Hero with product one-liner; header nav; footer.
- [ ] Fully server-rendered, indexable, <1s LCP on desktop.

**R2. Interactive roadmap page** (the product)
- [ ] Canvas renders a roadmap graph (pan/zoom, fit-view, mobile pinch) from JSON.
- [ ] Node types: title, primary topic, subtopic, section label, group container.
- [ ] Clicking a topic opens a right-side drawer: topic title, ~150–300-word explanation,
      resource list with type badges (article/video/docs, free/paid), "mark as" control.
- [ ] Progress states per node: pending / learning / done / skipped, with distinct visual
      treatment on the canvas and a roadmap-level progress bar.
- [ ] Anonymous progress in localStorage; merged into account on signup.
- [ ] Below the canvas: SEO content block (what-is, role description, FAQ accordion)
      rendered server-side from the roadmap's content record.
- Given a roadmap URL, when a crawler fetches it, then title/description/FAQ content is
  present in the HTML without JS.

**R3. Auth + persistence**
- [ ] Email magic-link + Google + GitHub OAuth.
- [ ] Progress, bookmarks, and generated artifacts stored per user.
- [ ] Account page: name, avatar, delete account (GDPR — you're in Germany).

**R4. AI roadmap generator ("Create with AI")**
- [ ] Form: topic (free text), level (beginner/intermediate/advanced), optional goal +
      hours/week.
- [ ] Produces a valid roadmap JSON (schema-validated, auto-laid-out) and renders it in
      the same canvas viewer; saved to the user's library.
- [ ] Streaming progress indicator during generation; hard failure → retry with error
      message, never a blank canvas.
- [ ] Runs on the user's configured provider/key (R7); with no key set, the form shows
      an "add your API key in Settings" state instead of failing.

**R5. Content pipeline (internal tool, not a page)**
- [ ] Script(s) that generate the official catalog: graph → topic content → resources →
      quizzes, with schema validation and a human-review diff step (doc 06).
- [ ] ≥5 seeded roadmaps at launch; ≥20 within week one.

**R6. Dashboard**
- [ ] Signed-in home: continue-learning cards (roadmap + % + last activity), bookmarks,
      my generated roadmaps.

**R7. BYOK provider settings**
- [ ] Settings page: pick provider (OpenAI / Anthropic / Google Gemini / OpenRouter),
      paste API key, choose default smart/fast models per doc 05 §4.
- [ ] Keys live in the browser (localStorage), travel per request over HTTPS, and are
      never persisted or logged server-side; a "Test key" button validates with a
      minimal call and maps provider errors to plain language.
- [ ] Every AI surface shows the active provider/model and tokens used for the last
      action — cost transparency replaces metering.

### P1 — Fast follow

- **Roadmap Chat:** per-roadmap tutor chat (context = graph + current node), streaming,
  saved threads. Runs on the configured key; per-thread token readout.
- **Topic quizzes:** 5-question MCQ per topic from the pipeline; score + explanations;
  attempt history.
- **Guides:** AI-drafted, human-edited article library with listing page (SEO growth).
- **Search:** typeahead across roadmaps/topics/guides.
- **Best-practice checklists** and **project ideas** sections (same data model, simpler
  renderers).
- **Custom roadmap editor:** React-Flow-based node editor (add/edit/connect/delete,
  autosave, share by link). AI-assist ("add 5 subtopics under X") using the
  configured provider key.
- **OG-image generation** per roadmap; sitemap; per-topic SEO pages.

### P2 — Later (design for, don't build)

- Local single-user mode (no auth; run via Docker) for pure personal use.
- Additional providers: local models via OpenAI-compatible endpoints (Ollama, LM Studio).
- Lesson packs / structured courses; interview-prep mode.
- Public community gallery of shared AI roadmaps with moderation.
- i18n (German first).

## Success metrics

**Leading (first 30 days):** roadmap page → node-interaction rate ≥40%; visitor→signup
≥5%; signup→first AI generation ≥50%; AI generation success (valid JSON, no retry) ≥95%.
**Lagging (quarter):** week-4 retention of signed-in users ≥15%; ≥100 organic search
sessions/day from guide/roadmap pages; ≥50% of signups configure a provider key
within a day.
**Measurement:** PostHog or Plausible + a `events` table for node interactions.

## Open questions

- (You) Name is decided (Pathgrid); still to do: register domain, claim @pathgrid
  handles, quick EUIPO trademark check.
- (You) Launch niche: full dev catalog vs. one wedge (e.g., "AI engineering paths only")?
  A wedge is easier to make excellent and to market.
- (You) Resources in topic drawers: AI-suggested links verified by web search, or
  link-free v1 (explanations + "search this" buttons) to avoid dead-link risk? Doc 06
  supports both; pick before seeding.
- (Engineering) Anonymous progress: localStorage-only vs. anonymous server session?
  Spec assumes localStorage (simplest, GDPR-friendly).
- (Legal, later) Terms/privacy pages before public launch; Impressum (Germany).
- (You) Hosted shared instance vs. self-host-only distribution: the spec supports both
  (auth can be skipped entirely in single-user mode) — decide before Phase 2.

## Phasing

Ship in the order of doc 08's phases: Phase 1–2 = R1/R2/R3/R6 (static-ish product),
Phase 3 = R7 + R4 + chat + quizzes, Phase 4 = editor, Phase 5 = guides/search/SEO
extras, Phase 6 = open-source distribution packaging. Content pipeline (R5) runs in
parallel from Phase 1.
