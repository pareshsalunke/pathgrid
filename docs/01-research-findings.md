# 01 — Research Findings: roadmap.sh (as of July 2026)

Factual analysis of roadmap.sh compiled from the live site, its public GitHub repository,
and public listings. This is the reference model for the clone. Descriptions below are
paraphrased observations of functionality — no content from the site should be copied
into your build (see "License and IP constraints" at the end).

---

## 1. What it is

A developer-education platform organized around interactive learning roadmaps. Started as
a GitHub repo of static roadmap images (2017), evolved into a full product with interactive
roadmaps, progress tracking, AI features, courses, and team plans.

**Scale signals (public figures, mid-2026):**
- ~359K GitHub stars — 6th most-starred repository on GitHub, ~44K forks
- ~2.8M registered users (+~90K/month claimed)
- ~49K Discord members
- Claimed AI usage: 160K+ AI roadmaps created, 150K+ AI courses generated, 1M+ AI conversations
- Monetized via a $10/mo Pro plan, team seats, and site sponsorships/advertising

## 2. Complete feature inventory

### 2.1 Content catalog (the free core)
- **Role-based roadmaps (~28):** Frontend, Backend, Full Stack, DevOps, DevSecOps,
  Data Analyst, AI Engineer, AI & Data Scientist, Data Engineer, Android, iOS,
  Machine Learning, MLOps, PostgreSQL DBA, Blockchain, QA, Software Architect,
  Cyber Security, UX Design, Technical Writer, Game Developer, Server-Side Game
  Developer, Product Manager, Engineering Manager, Developer Relations, BI Analyst,
  Network Engineer, Forward Deployed Engineer.
- **Skill-based roadmaps (~56):** languages (Python, JS, TS, Java, Go, Rust, C++, PHP,
  Ruby, Kotlin, Scala…), frameworks (React, Vue, Angular, Next.js, Spring Boot, Django,
  Laravel, Rails, Flutter, React Native, ASP.NET Core…), infra (Docker, Kubernetes, AWS,
  Cloudflare, Terraform, Linux…), data (SQL, PostgreSQL, MongoDB, Redis, Elasticsearch),
  practices (System Design, API Design, Code Review, Design System, DSA), and a fast-moving
  AI cluster added 2025–2026 (Prompt Engineering, AI Agents, AI Red Teaming, AI Product
  Builders, Claude Code, Vibe Coding, OpenClaw, LeetCode prep).
- **Roadmap variants:** some roadmaps ship an alternate "beginner" version toggled via a
  query parameter (e.g. `?r=frontend-beginner`) — same page, different graph.
- **Best Practices (5):** AWS, API Security, Backend Performance, Frontend Performance,
  Code Review — rendered as checkable checklist-style boards.
- **Project Ideas:** per-skill project catalogs (Frontend, Backend, DevOps, HTML, CSS,
  JavaScript, Node.js) with difficulty tiers; each project is a brief with requirements,
  and users can submit solution links and browse others' submissions.
- **Guides:** SEO article library (tutorials, comparisons, "how to become X", error
  explainers). New guides published continuously; many are roadmap-adjacent
  (e.g. `/python/keyerror`, `/terraform/backend`).
- **Question banks:** per-topic interview question pages ("Top N X interview questions"),
  some with self-rating/quiz interactions.
- **Videos:** short visual explainers tied to the YouTube channel.
- **Changelog:** monthly public log of new roadmaps and features (drives return visits +
  newsletter subscriptions).

### 2.2 The interactive roadmap experience (the signature UX)
- A zoomable/pannable canvas renders the roadmap as a flowchart: a central spine of
  primary topics with subtopic clusters branching off, connected by solid/dashed lines.
- **Clicking a node opens a drawer/panel** with: topic explanation, curated resource list
  (articles / videos / official docs, with free vs. paid markers), and AI actions
  (ask the tutor about this topic, generate a course).
- **Per-node progress states:** done / in progress / skipped / pending. Logged-in users'
  progress persists; a progress bar shows % completion per roadmap.
- **Page anatomy** (server-rendered around the canvas for SEO): title + one-line
  description, action buttons (projects, AI chat, download, share), the canvas, then a
  long-form SEO section ("What is a frontend developer?", required skills, FAQs with
  expandable answers), then community stats and footer.
- Roadmaps can be shared, and OG images are generated per roadmap for social embeds.

### 2.3 AI Tutor suite (the monetization engine, at `/ai`)
A separate app-like area ("Roadmap AI") with:
- **Create with AI:** generate a *Plan*, *Course*, *Guide*, *Roadmap*, or *Quiz* from a
  free-text topic + difficulty level. Output is saved to "My Learning".
- **Ask AI Tutor:** open-ended chat for career/resume/learning questions.
- **Roadmap Chat:** chat grounded in a specific official roadmap (user picks the roadmap,
  the AI answers in its context).
- **Test my Skills:** AI-generated quizzes / interview-prep with feedback.
- **My Learning:** library of everything the user generated.
- **Staff Picks / Community:** showcase of publicly shared AI-generated courses.

### 2.4 Lesson Packs (newest content format, Pro-gated)
Hand-crafted visual lesson bundles with embedded projects and an AI tutor side panel.
Launched packs cover internet fundamentals, HTML, CSS, and JavaScript foundations
(6–20 lessons each, with per-pack durations and project counts); more announced
(Node CLI apps, Git, Linux, APIs, SQL/Postgres, RegEx). Positioned as the "premium
course" layer on top of free roadmaps.

### 2.5 Custom roadmaps & editor
- Users can create their own roadmaps in a visual drag-and-drop editor
  (nodes, labels, connectors), publish/share them, and (on Pro) use AI assistance
  inside the editor.
- Note: the editor is **closed source** — the public repo swaps in a dummy package
  (`@roadmapsh/editor` → `@roadmapsh/dummy-editor`) for local development. You will
  build your own editor (React Flow makes this tractable — see doc 05).

### 2.6 Accounts, dashboard, growth loops
- Auth: email + social login; personal dashboard aggregating progress across roadmaps,
  bookmarks, and AI-generated items.
- Bookmarking roadmaps from any card (the bookmark icon on catalog cards).
- Newsletter subscriptions (per-roadmap "weekly newsletter" prompts + changelog subscribe).
- Community CTAs everywhere: GitHub star, Discord, YouTube.

### 2.7 Teams (B2B layer)
- Team workspaces: shared custom roadmaps, assigning roadmaps to members, tracking
  member progress and skill gaps, onboarding/growth plans, centralized seat billing.
- Pricing: $10/seat/month billed annually, minimum 3 seats, 7-day free trial.

### 2.8 Monetization summary
| Plan | Price | What it gates |
|---|---|---|
| Free | $0 | 2 AI courses, 2 AI guides, 2 custom roadmaps, 2 AI roadmaps; daily token caps on chat; no chat history; basic editor; limited quizzes/coaching |
| Pro | $10/mo or $100/yr (~$8.33/mo) | Unlimited AI generation, all lesson packs, chat history, up to 100 custom roadmaps, AI-powered editor, extended chat limits |
| Team | $10/seat/mo (annual, min 3) | Pro for all members + team roadmaps, assignments, progress/skill-gap tracking, centralized billing |
| Ads/Sponsors | n/a | Footer partner placement, an "Advertise" page for promoting products to the developer audience |

The free→paid conversion mechanic is **metered AI usage**: every AI feature works on free,
but with small counters and daily token limits; Pro removes the meters.

## 3. Tech stack (from the public repo)

- **Frontend:** Astro (static-first, ~11% of code) with React islands, TypeScript (~85%),
  Tailwind CSS. pnpm workspace monorepo with a `packages/` directory.
- **Testing:** Playwright config present.
- **Content storage:** roadmap topic content lives as markdown files in the repo
  (`src/data/roadmaps/<slug>/content/…`) plus a JSON graph definition per roadmap;
  the renderer/editor consumes that JSON.
- **Editor:** private npm package, closed source.
- **Backend/API:** closed source (auth, progress, AI, payments run against a private API).
- **Ops/marketing details visible:** Google Tag Manager, Cloudflare, OneTrust cookie
  consent, generated OG images, sitemap script, per-page SEO metadata done carefully
  (canonical, keywords, FAQ content on page).
- **Mobile:** iOS/Android app shipped ~2026 ("roadmap.sh" by Insight Media Group) wrapping
  the AI tutor/course features, with in-app Pro subscriptions.

**Implication for the clone:** the "open source" part is essentially the content site +
renderer; everything you actually need for parity (API, auth, AI, editor, payments) is
closed and must be designed fresh — which doc 04/05 do.

## 4. License and IP constraints (important)

The repository is *source-available, not open source*. Its license (923-byte custom text,
copyright Kamran Ahmed) states in essence: all text and images are copyright-protected;
use is permitted for **personal use only**; publishing the images, project files, or
content elsewhere in any form is not allowed; sharing links to the repo/site is fine;
GitHub forks made to contribute back are the only sanctioned copies.

**What this means for your build:**
- Do **not** fork-and-rebrand, and do not copy their roadmap JSONs, topic markdown,
  guide articles, images, or marketing copy into your product.
- Do **not** reuse the name "roadmap.sh", its logo, or confusingly similar branding.
- You **may** build a product with the same *category of functionality* (interactive
  roadmap canvases, progress tracking, AI generation, etc.) — features, ideas, and
  general UI patterns are not protected; specific expression is.
- Your safest and cleanest path (and your stated plan anyway): original codebase,
  original design language, and 100% AI-generated + human-reviewed content.
- Not legal advice — if you later commercialize seriously, have a lawyer sanity-check.

## 5. What to replicate vs. rethink

**Replicate (proven mechanics):**
- Canvas-with-drawer roadmap UX and 4-state progress tracking
- Catalog homepage as an SEO hub; long-form SEO sections under each roadmap
- Metered-AI freemium model; "My Learning" library for generated artifacts
- Changelog + newsletter loop

**Rethink (your edge, since content is AI-generated):**
- Personalization at the root: ask goal/experience/hours-per-week up front and generate
  a *personal* variant of any roadmap, rather than one-size-fits-all graphs
- Freshness: regenerate/refresh topic content on a schedule (their community model
  updates slowly; your pipeline can update weekly)
- Any niche beyond software (they are dev-only) — e.g. PM skills, languages, finance —
  same engine, different catalog
