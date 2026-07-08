/** Static placeholder catalog for the home page. Phase 1 replaces this with a
 *  DB read (docs/04 §2). Shape mirrors what Home.dc.html renders: role cards
 *  (with either a progress % or a topic count) and compact skill chips. */

export type RolePath = {
  slug: string;
  title: string;
  /** Percent complete for an in-progress path; undefined shows the topic count. */
  progress?: number;
  topics: number;
  isNew?: boolean;
};

export type SkillPath = {
  slug: string;
  title: string;
  topics: number;
  isNew?: boolean;
};

export type ChangelogEntry = {
  date: string;
  text: string;
};

export const rolePaths: RolePath[] = [
  {
    slug: "product-manager",
    title: "Product manager",
    progress: 42,
    topics: 46,
  },
  { slug: "frontend-developer", title: "Frontend developer", topics: 54 },
  { slug: "backend-developer", title: "Backend developer", topics: 58 },
  { slug: "ai-engineer", title: "AI engineer", topics: 61, isNew: true },
  { slug: "full-stack-developer", title: "Full stack developer", topics: 72 },
  { slug: "devops-engineer", title: "DevOps engineer", topics: 49 },
  { slug: "data-analyst", title: "Data analyst", topics: 44 },
  { slug: "engineering-manager", title: "Engineering manager", topics: 41 },
];

export const skillPaths: SkillPath[] = [
  { slug: "typescript", title: "TypeScript", topics: 32 },
  { slug: "react", title: "React", topics: 40 },
  { slug: "sql", title: "SQL", topics: 28 },
  { slug: "system-design", title: "System design", topics: 36 },
  { slug: "git-github", title: "Git & GitHub", topics: 18 },
  { slug: "docker", title: "Docker", topics: 22 },
  {
    slug: "prompt-engineering",
    title: "Prompt engineering",
    topics: 20,
    isNew: true,
  },
  { slug: "api-design", title: "API design", topics: 26 },
  { slug: "kubernetes", title: "Kubernetes", topics: 30 },
  { slug: "linux", title: "Linux", topics: 24 },
  { slug: "graphql", title: "GraphQL", topics: 16 },
  { slug: "testing", title: "Testing", topics: 21 },
];

export const changelog: ChangelogEntry[] = [
  {
    date: "Jun 28",
    text: "Team paths — share one roadmap, see everyone's progress",
  },
  { date: "Jun 14", text: "Tutor can now cite the exact node it's explaining" },
  { date: "May 30", text: "List view for every canvas — full keyboard path" },
];
