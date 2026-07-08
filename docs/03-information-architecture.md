# 03 — Information Architecture

Sitemap, route table, page-level layout specs, and SEO strategy. Feed this document to
both Claude Design (screen structure) and Claude Code (routing).

---

## 1. Global navigation

**Header (sticky, dark):**
- Left: logo mark + wordmark → `/`
- Nav item "Roadmaps" (dropdown): All Roadmaps, Get Started (guided path picker),
  Projects, Guides, Best Practices — each row = icon + title + one-line subtitle.
- Nav item "AI Tutor" (dropdown): Create with AI, Roadmap Chat, Ask the Tutor, Test My
  Skills — same row pattern.
- Right (logged out): Login (text) + Sign Up (primary pill).
- Right (logged in): search icon, avatar menu → Dashboard, My Learning, Settings
  (profile + AI provider keys), Logout.

**Footer:** product links (Roadmaps, Guides, AI, Changelog), company (About, Terms,
Privacy, Impressum), social icons, newsletter email capture, copyright.

## 2. Route table

| Route | Type | Auth | Purpose |
|---|---|---|---|
| `/` | SSG | – | Catalog home (hero + card grids + changelog teaser) |
| `/roadmaps` | SSG | – | Full catalog with filter tabs (Role / Skill) |
| `/[roadmapSlug]` | SSG/ISR | – | Interactive roadmap page (canvas + drawer + SEO block) |
| `/[roadmapSlug]/[topicSlug]` | SSG | – | (P1) Indexable topic page = drawer content as a page |
| `/[roadmapSlug]/projects` | SSG | – | (P1) Project ideas for that track |
| `/projects/[projectSlug]` | SSG | – | (P1) Single project brief |
| `/best-practices` + `/best-practices/[slug]` | SSG | – | (P1) Checklist boards |
| `/guides` + `/guides/[slug]` | SSG | – | (P1) Article library |
| `/ai` | CSR shell | – | AI hub: tabs for Create / Chat / Quiz; gated actions prompt login |
| `/ai/roadmap/[id]` | CSR | owner | Viewer for a user-generated roadmap (same canvas component) |
| `/ai/chat/[threadId]` | CSR | owner | Tutor chat thread |
| `/editor/[id]` | CSR | owner | (P1) Custom roadmap editor |
| `/dashboard` | SSR | ✓ | Continue-learning, bookmarks, my library |
| `/settings` | SSR | ✓ | Profile, AI provider & API keys, default models, account deletion |
| `/login`, `/signup` | SSR | – | Auth (magic link + OAuth buttons) |
| `/changelog` | SSG | – | Release log (drives newsletter) |
| `/about`, `/terms`, `/privacy`, `/imprint` | SSG | – | Legal/static |
| `/api/*` | API | mixed | See doc 04 §4 |
| `/og/[roadmapSlug]` | Edge | – | (P1) Generated OG image per roadmap |
| `/sitemap.xml`, `/robots.txt` | Static | – | SEO plumbing |

## 3. Page-by-page layout specs

### 3.1 Home `/`
1. **Hero:** display headline (product promise), one-line subhead, primary CTA
   ("Pick a roadmap") + secondary ("Generate your own with AI"). Keep it short — the
   grids are the hero in practice.
2. **Section: Role-based roadmaps** — labeled divider chip, 3-column card grid (1-col
   mobile). Card = title + bookmark icon; hover lift; "New" badge support.
3. **Section: Skill-based roadmaps** — same grid, more items, "show all" expander after
   ~24 cards.
4. **Section: Generate with AI** — one wide banner card: input field ("What do you want
   to learn?") that deep-links into `/ai` with the query prefilled. This is the clone's
   differentiator; give it visual weight.
5. **Section: Latest updates** — 3 changelog entries + newsletter form.
6. Footer.

### 3.2 Roadmap page `/[roadmapSlug]`
- **Header strip:** breadcrumb ("← All roadmaps"), H1 title, one-line description,
  action row: [Progress ▓▓▓░ 34%] [Share] [Download PNG (P1)] [Chat about this roadmap].
- **Canvas viewport:** fills width, ~70vh, light surface (deliberate contrast against
  dark chrome — see design brief), controls bottom-right (zoom ±, fit), legend chip
  explaining node states.
- **Topic drawer (overlays right, 420–480px; bottom sheet on mobile):**
  title, status selector (pending/learning/done/skipped), body text, "Resources" list
  (badge + title + domain), AI row: [Explain differently] [Quiz me] [Open in chat].
  Closing returns focus to the node.
- **Below canvas:** long-form content — intro ("What is X?"), "What does an X do",
  skills overview, FAQ accordion (5–8 Q&As). All AI-generated per roadmap, stored in DB,
  server-rendered.
- **Related roadmaps** card row → internal linking for SEO.

### 3.3 AI hub `/ai`
- Left rail (desktop): New chat, Create tabs (Roadmap / Course-plan / Quiz), My Learning
  list, active provider/model chip + session token counter.
- Main pane: tab content. *Create Roadmap* = form (topic, level, goal, hours/week) →
  streaming generation state (progress steps: outline → topics → layout) → canvas preview
  with [Save to library] [Regenerate] [Open full view].
- *Chat* = standard streaming chat with roadmap-context selector.
- Empty states explain what each mode does; if no key is configured, AI actions show a
  friendly "connect your API key" card that deep-links to Settings.

### 3.4 Dashboard `/dashboard`
- Row 1: "Continue learning" cards (roadmap title, progress bar, last active, resume →
  scrolls to first non-done node).
- Row 2: Bookmarks grid. Row 3: My AI library (generated roadmaps/quizzes with type
  badges). Empty states link to catalog / AI hub.

### 3.5 Editor `/editor/[id]` (P1)
- Full-height canvas; left palette (Topic, Subtopic, Label, Section); top bar (title
  inline-edit, autosave state, share, AI assist button opening a prompt popover:
  "add subtopics under selected node"). Right panel = selected-node properties
  (label, content, resources).

### 3.6 Settings `/settings` (ships with Phase 3)
- Sections: Profile · **AI Provider** · Account.
- AI Provider section: provider selector (OpenAI / Anthropic / Gemini / OpenRouter),
  masked key input with a "Test key" button and clear success/failure feedback,
  smart/fast model pickers populated per provider, a plain-language privacy note
  ("your key stays in this browser; requests are proxied and never stored"), and a
  "Clear key" action.
- All missing-key empty states across the app deep-link to this section.

## 4. SEO strategy (why this IA looks the way it does)

- Every roadmap page is a **static, content-rich landing page**: H1 with the role/skill
  keyword, descriptive intro, FAQ accordion (also emitted as FAQPage JSON-LD),
  related-roadmap internal links.
- (P1) Every topic gets a canonical URL (`/[roadmap]/[topic]`) rendering the same content
  as the drawer — this is the long-tail play ("what is CSS specificity" class queries).
- Guides section exists primarily for SEO compounding; each guide links back to its
  roadmap and 2–3 topics.
- Per-roadmap OG images (title + mini-graph motif) for social CTR.
- `sitemap.xml` regenerated on content deploy; `lastmod` from content table.
- Performance budget: roadmap pages ship HTML+CSS first; the canvas hydrates as an
  island; Lighthouse SEO/Best-practices ≥95.

## 5. State & permissions summary

- Anonymous: view everything, progress in localStorage, AI actions → login prompt with
  a "your setup is saved" reassurance.
- Signed in, no key: progress sync, bookmarks; AI surfaces show an "add your API key"
  state linking to Settings.
- Signed in with key: all AI features — generation, chat with history, quizzes, editor
  AI-assist. No meters anywhere; the UI shows tokens used per action instead.
