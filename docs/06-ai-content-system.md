# 06 — AI Content System

How all content gets generated with any modern model (Claude, GPT, Gemini, or anything
on OpenRouter): the build-time seeding pipeline for the official catalog, and the
runtime BYOK features. All prompt templates below are
original and ready to adapt.

---

## 1. Two modes, one schema

- **Seeding (build time):** scripts in `/pipeline` generate the official catalog into
  Postgres. Human reviews diffs before publish.
- **Runtime (user-facing):** the same generators, wrapped in API routes that run on the
  user's own key via the provider registry (doc 05 §4), produce personalized roadmaps,
  chats, and quizzes on demand.

Both modes must output graphs valid against the schema in doc 04 §3. Shared Zod schemas
live in `/lib/schemas` and are imported by pipeline and API alike.

## 2. Seeding pipeline (run per roadmap)

```
catalog.yaml (slug, title, category, level, angle)
   │ 1. outline      → ordered stage list w/ topics + subtopics (text JSON)
   │ 2. graphify     → schema-valid graph (ids, edges, optional flags)
   │ 3. layout       → elkjs top-down layout → node positions
   │ 4. topic content→ body_md + objectives + pitfalls per topic (Batch API)
   │ 5. resources    → suggest official docs/tutorials → verify via web search/HEAD
   │ 6. seo block    → intro, role description, 6 FAQs
   │ 7. quizzes      → 5 MCQs per topic (Haiku)
   │ 8. review gate  → render preview + critique pass + human approve
   └ 9. publish      → upsert DB, revalidate ISR, rebuild sitemap
```

Practical notes:
- Steps are idempotent and resumable; store intermediate JSON in `/pipeline/out/<slug>/`
  so a failed step 5 doesn't redo steps 1–4.
- Two-pass generation (outline → graphify) produces dramatically better graphs than
  one-shot; the outline pass is where pedagogy happens, the graphify pass is mechanical.
- Batch step 4 and 7 through the provider's batch API (≈50% cheaper, fine for seeding).
- **Resource policy decision (open question in doc 02):**
  *Policy A (recommended v1):* only link official documentation + one canonical free
  tutorial per topic, each verified reachable (HTTP 200 + title sanity check via web
  search). *Policy B:* no external links; drawer offers "Search this topic" buttons.
  Never publish unverified URLs — dead links destroy trust faster than no links.
- Rough cost math for planning: a 60-topic roadmap ≈ 1 outline call + 1 graphify call +
  60 content calls + 60 quiz calls + 1 SEO call. At Sonnet/Haiku batch rates this lands
  in the low single-digit dollars per roadmap; the full 20-roadmap catalog comfortably
  under $50. Verify against current pricing before the big batch run.

## 3. Prompt templates (original — adapt freely)

### 3.1 Outline (step 1)
```
System: You are a senior curriculum designer for self-taught developers. You design
learning paths that are opinionated, ordered, and honest about what is optional.

User: Design a learning path outline for: {title} ({category}, target level: {level}).
Learner context: {angle — e.g. "assumes basic programming, aims for job-readiness"}.

Rules:
- 5–9 stages, each with 3–8 topics; mark topics OPTIONAL when reasonable people skip them.
- Order by dependency, not popularity. No tool-brand soup: prefer concepts, name at most
  one concrete tool per concept and mark alternatives.
- Include one early "you can already build something" milestone stage.
Return JSON only:
{"stages":[{"name":str,"topics":[{"title":str,"optional":bool,
"subtopics":[str,...]}]}]}
```

### 3.2 Graphify (step 2)
```
System: You convert curriculum outlines into graph JSON. You never invent new topics.
Output must validate against the provided JSON schema. Output JSON only, no prose.

User: Schema: {paste doc-04 §3 schema}. 
Conventions: one "title" node; stages become "section" nodes containing their topics;
topics = type "topic", subtopics = type "subtopic"; sequential stage flow uses
kind:"sequence" solid edges; topic→subtopic uses kind:"related" dashed edges; ids are
kebab-case slugs; positions all {x:0,y:0} (layout happens later); set data.order as a
global learning sequence; carry the optional flag.
Outline: {outline JSON}
```
Post-process: Zod validate → on error, repair call: *"This JSON failed validation with
these errors: {errors}. Return corrected JSON only."* → validate again or abort.

### 3.3 Topic content (step 4)
```
System: You write concise explanations for a developer-education site. Voice: direct,
practical, zero fluff, no marketing language. You write original content only.

User: Roadmap: {roadmap title}. Topic: {topic title}. Neighbor topics (context, do not
re-explain them): {prev}, {next}. Write JSON:
{"body_md": "150–300 words: what it is, why it matters at this point in the path, and
what 'good enough to move on' looks like",
 "objectives": ["3–5 checkable 'I can …' statements"],
 "pitfalls": ["2–3 mistakes beginners make"],
 "est_hours": number}
```

### 3.4 SEO block (step 6)
```
User: For the "{title}" roadmap, write JSON: {"metaTitle": "<60 chars",
"metaDesc": "<155 chars", "intro_md": "250–400 words answering 'What is a {title}
developer / what is {title}' for a search visitor, original wording",
"faqs":[6 × {"q","a≤120 words"}]}. Plain language, no hype, no invented statistics.
```

### 3.5 Quiz (step 7)
```
System: You write fair multiple-choice questions that test understanding, not trivia.

User: Topic: {title}. Context: {body_md}. Write JSON: {"questions":[5 ×
{"q":str,"options":[4 strings, one correct, distractors plausible],
"answerIdx":0-3,"why":"1–2 sentence explanation"}]}.
Vary difficulty: 2 recall, 2 application, 1 tricky-but-fair.
```

### 3.6 Runtime: personalized roadmap ("Create with AI")
Same two-pass chain as seeding, with the user's inputs injected into the outline prompt:
```
Learner context: goal="{goal}", current level="{level}", prior knowledge="{known}",
time budget={hours}/week. Trim ruthlessly: exclude topics the learner already knows,
cap total est_hours near {hours × 12}, and start with the fastest path to a working
result. 4–6 stages max.
```
Stream progress states to the client between steps ("Designing outline… → Building
graph… → Laying out…") — perceived speed matters more than actual speed.

### 3.7 Runtime: roadmap chat (system prompt skeleton)
```
You are the tutor for the "{title}" learning path on {ProductName}. Ground every answer
in the path below; when the user asks "what next", use their progress. Be concise;
prefer pointing to a node over long lectures; say when something is outside this path.

PATH OUTLINE (node · status): {compact "1. HTML — done / 2. CSS — learning / …"}
CURRENTLY OPEN TOPIC: {title + body_md, if drawer open}
```

## 4. Quality gates (don't skip these)

1. **Schema gate** — Zod on every structured output, with one auto-repair attempt.
2. **Critique pass** — before human review, run a cheap model over each roadmap:
   *"List problems: ordering errors, duplicate topics, missing fundamentals, hype
   wording, factual risk."* Attach the list to the review UI/diff.
3. **Human gate (you)** — 10-minute review per roadmap against a fixed checklist:
   order sane? optional flags sensible? no invented tools/versions? tone consistent?
   resources load? Publish only after sign-off; the pipeline writes `status='draft'`
   until then.
4. **Freshness job (P1)** — monthly re-run of steps 4–6 per roadmap with a diff view;
   your structural advantage over community-maintained content.
5. **Provenance** — store `generated_by` (model, prompt version, date) on every content
   row; label AI-generated content in the UI footer ("AI-drafted, human-reviewed") —
   honest and increasingly expected.

## 5. BYOK runtime rules (replaces metering)

- Every runtime AI call runs on the caller's provider key, forwarded per request and
  never stored or logged (contract in doc 05 §4). The seeding pipeline uses your own
  key from `.env` — keep the two code paths physically separate.
- No usage limits: users pay their provider. Instead, return usage figures with every
  response and show tokens + approximate cost per action and per session.
- Provider-agnostic prompts: everything in §3 is plain JSON instruction with no
  vendor-specific features, so the same templates work across GPT, Claude, Gemini, and
  OpenRouter models. Honor the user's smart/fast tier choices.
- Input hygiene still applies: goal field ≤ 500 chars; keep the generator on-mission
  (learning content only) — this protects output quality, not your wallet.
- Log every AI call to `events` (provider, model, tokens, latency, success) — it powers
  the session-cost display and quality debugging across providers.
- Error mapping matters more in a BYOK app: surface provider errors as actionable
  messages ("key invalid", "out of credit on your OpenAI account", "model unavailable —
  pick another in Settings") rather than generic failures.
