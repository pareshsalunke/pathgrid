# 04 — Data Model & API Surface

Original schema design for Pathgrid. Postgres + a JSON graph format compatible with
React Flow. Nothing here is copied from any existing system.

---

## 1. Entity overview

```
users ─┬─ user_topic_progress ─── roadmaps ─── roadmap_versions (graph JSON)
       ├─ bookmarks ────────────────┘  └────── topics ─┬─ resources
       ├─ generated_items (AI roadmaps/quizzes/plans)  └─ quizzes ── quiz_questions
       ├─ chat_threads ── chat_messages
       └─ quiz_attempts
(no billing, metering, or team tables — BYOK: user API keys never touch the DB)
guides, projects, changelog_entries   events (analytics)
```

## 2. Core tables (DDL sketch — Drizzle/Prisma equivalent is fine)

```sql
-- Identity
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text, avatar_url text,
  created_at timestamptz default now()
);

-- Official + user roadmaps share one table
create table roadmaps (
  id uuid primary key default gen_random_uuid(),
  slug text unique,                            -- null for private user roadmaps
  title text not null,
  brief text,                                  -- one-line description
  category text not null,                      -- role | skill | custom
  kind text not null default 'roadmap',        -- roadmap | best_practice | project_set
  owner_id uuid references users(id),          -- null = official
  visibility text not null default 'public',   -- public | unlisted | private
  is_ai_generated boolean default false,
  seo jsonb,                                   -- {metaTitle, metaDesc, intro_md, faqs:[{q,a}]}
  current_version_id uuid,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table roadmap_versions (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references roadmaps(id) on delete cascade,
  graph jsonb not null,                        -- see §3 schema
  version int not null,
  created_at timestamptz default now()
);

-- One row per canvas node that carries learnable content
create table topics (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references roadmaps(id) on delete cascade,
  node_id text not null,                       -- matches graph node id
  slug text not null,                          -- for /[roadmap]/[topic] pages
  title text not null,
  body_md text,                                -- drawer explanation
  meta jsonb,                                  -- {objectives:[], pitfalls:[], est_hours}
  unique (roadmap_id, node_id), unique (roadmap_id, slug)
);

create table resources (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  kind text not null,                          -- article | video | docs | course | book
  title text not null, url text not null,
  is_paid boolean default false,
  position int default 0,
  status text default 'unverified'             -- unverified | verified | dead
);

create table user_topic_progress (
  user_id uuid references users(id) on delete cascade,
  roadmap_id uuid references roadmaps(id) on delete cascade,
  node_id text not null,
  status text not null,                        -- pending | learning | done | skipped
  updated_at timestamptz default now(),
  primary key (user_id, roadmap_id, node_id)
);

create table bookmarks (
  user_id uuid references users(id) on delete cascade,
  roadmap_id uuid references roadmaps(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, roadmap_id)
);

-- Everything a user generates in the AI hub
create table generated_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null,                          -- roadmap | plan | quiz | guide
  title text not null,
  payload_ref uuid,                            -- roadmaps.id when kind='roadmap'
  payload jsonb,                               -- inline for quiz/plan
  created_at timestamptz default now()
);

create table chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  roadmap_id uuid references roadmaps(id),     -- null = general tutor
  title text, created_at timestamptz default now()
);
create table chat_messages (
  id bigserial primary key,
  thread_id uuid not null references chat_threads(id) on delete cascade,
  role text not null,                          -- user | assistant
  content text not null,
  tokens int, created_at timestamptz default now()
);

create table quizzes (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id) on delete cascade,
  questions jsonb not null                     -- [{q, options[4], answerIdx, why}]
);
create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  quiz_id uuid references quizzes(id),
  score int, answers jsonb, created_at timestamptz default now()
);

-- BYOK: no metering tables. Token counts for the cost display live on
-- chat_messages.tokens and in events (name='ai_call',
-- props={provider, model, in_tokens, out_tokens, latency_ms}).
-- User API keys are NEVER stored in the database (client-side only; see doc 05 §4).

create table guides (
  id uuid primary key, slug text unique, title text, body_md text,
  roadmap_id uuid references roadmaps(id), status text default 'draft',
  published_at timestamptz
);

create table events (                          -- lightweight product analytics
  id bigserial primary key, user_id uuid, anon_id text,
  name text not null, props jsonb, created_at timestamptz default now()
);
```

Removed by design: no `subscriptions`, `teams`, or metering tables — monetization and
team features are permanently out of scope for this build.

## 3. Roadmap graph JSON schema (the heart of the system)

Stored in `roadmap_versions.graph`. Deliberately React-Flow-shaped so the same JSON
drives the viewer, the editor, and AI generation.

```jsonc
{
  "$schema": "pathgrid/roadmap-graph/v1",
  "meta": { "title": "…", "level": "beginner|mixed|advanced", "estHours": 120 },
  "nodes": [
    {
      "id": "n1",                      // stable, referenced by topics.node_id & progress
      "type": "title|topic|subtopic|label|section",
      "position": { "x": 0, "y": 0 },  // filled by auto-layout, editable later
      "data": {
        "label": "…",
        "slug": "…",                   // only topic/subtopic
        "order": 3,                    // learning sequence hint
        "optional": false              // renders dashed/“nice to know”
      },
      "parentId": "sec-frontend"       // optional: section grouping
    }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "n2",
      "data": { "style": "solid|dashed", "kind": "sequence|related" } }
  ]
}
```

**Validation rules (enforce with Zod both at API boundary and inside the AI pipeline):**
node ids unique; every edge endpoint exists; exactly one `title` node; every
`topic|subtopic` has non-empty label + slug; graph is connected; 15–80 content nodes for
an official roadmap; no cycles among `sequence` edges.

**Minimal illustrative example (original, trivial on purpose):**

```json
{ "$schema": "pathgrid/roadmap-graph/v1",
  "meta": { "title": "Markdown Basics", "level": "beginner", "estHours": 2 },
  "nodes": [
    { "id": "t", "type": "title",    "position": {"x":0,"y":0},   "data": {"label": "Markdown Basics"} },
    { "id": "a", "type": "topic",    "position": {"x":0,"y":120}, "data": {"label": "Headings & Text", "slug": "headings-text", "order": 1} },
    { "id": "b", "type": "topic",    "position": {"x":0,"y":240}, "data": {"label": "Lists & Links",  "slug": "lists-links",  "order": 2} },
    { "id": "b1","type": "subtopic", "position": {"x":220,"y":240},"data": {"label": "Images", "slug": "images", "order": 3, "optional": true} }
  ],
  "edges": [
    { "id": "e1", "source": "t", "target": "a", "data": {"style":"solid","kind":"sequence"} },
    { "id": "e2", "source": "a", "target": "b", "data": {"style":"solid","kind":"sequence"} },
    { "id": "e3", "source": "b", "target": "b1","data": {"style":"dashed","kind":"related"} }
  ] }
```

## 4. API surface (route handlers)

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/roadmaps` | – | Catalog (id, slug, title, category, badges) |
| `GET /api/roadmaps/[slug]` | – | Graph JSON + seo block (cached/CDN) |
| `GET /api/roadmaps/[slug]/topics/[topicSlug]` | – | Drawer payload (body_md + resources + quiz id) |
| `GET/PUT /api/progress/[roadmapId]` | ✓ | Read/write `{nodeId: status}` map (PUT is batched) |
| `POST /api/progress/merge` | ✓ | Merge localStorage progress at signup |
| `GET/POST/DELETE /api/bookmarks` | ✓ | Bookmark CRUD |
| `POST /api/ai/roadmap` | ✓ | Generate personalized roadmap (SSE stream; caller's provider key) |
| `POST /api/ai/chat` | ✓ | Tutor/roadmap chat (SSE; context assembly server-side) |
| `POST /api/ai/quiz` | ✓ | Generate or fetch cached quiz for topic |
| `POST /api/quiz-attempts` | ✓ | Grade + store attempt |
| `GET /api/me/library` | ✓ | generated_items list |
| `PATCH /api/editor/[roadmapId]` | owner | Save custom-roadmap graph (debounced autosave) |

**Conventions:** all writes idempotent where possible; Zod-validate every body. AI routes
read the caller's provider config from headers (`x-ai-provider`, `x-ai-model`) plus the
key in `Authorization: Bearer` — used in memory for the duration of the call, forwarded
to the provider, never logged or persisted. Missing/invalid key returns
`{error:"no_provider_key"}`, which every UI maps to a Settings deep-link. Keep light
IP rate limiting as abuse protection if you host a shared public instance. Progress
writes fire an `events` row (`node_status_set`) for the metrics in doc 02.
