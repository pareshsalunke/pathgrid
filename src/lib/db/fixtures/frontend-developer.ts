import type { RoadmapFixture } from "./types";

/** Hand-written sample (role path). Position-less graph — elkjs lays it out. */
export const frontendDeveloper: RoadmapFixture = {
  slug: "frontend-developer",
  title: "Frontend developer",
  brief:
    "A step-by-step path from the basics of the web to a job-ready frontend skill set.",
  category: "role",
  graph: {
    $schema: "pathgrid/roadmap-graph/v1",
    meta: { title: "Frontend developer", level: "beginner", estHours: 120 },
    nodes: [
      { id: "fe", type: "title", data: { label: "Frontend developer" } },
      {
        id: "internet",
        type: "topic",
        data: { label: "How the internet works", slug: "internet", order: 1 },
      },
      {
        id: "html",
        type: "topic",
        data: { label: "HTML", slug: "html", order: 2 },
      },
      {
        id: "css",
        type: "topic",
        data: { label: "CSS", slug: "css", order: 3 },
      },
      {
        id: "javascript",
        type: "topic",
        data: { label: "JavaScript", slug: "javascript", order: 4 },
      },
      {
        id: "git",
        type: "topic",
        data: { label: "Version control", slug: "version-control", order: 5 },
      },
      {
        id: "npm",
        type: "topic",
        data: { label: "Package managers", slug: "package-managers", order: 6 },
      },
      {
        id: "react",
        type: "topic",
        data: { label: "Frameworks", slug: "frameworks", order: 7 },
      },
      {
        id: "build",
        type: "topic",
        data: { label: "Build tools", slug: "build-tools", order: 8 },
      },
      {
        id: "testing",
        type: "topic",
        data: { label: "Testing", slug: "testing", order: 9 },
      },
      {
        id: "security",
        type: "topic",
        data: { label: "Web security", slug: "web-security", order: 10 },
      },
      {
        id: "perf",
        type: "topic",
        data: { label: "Web performance", slug: "web-performance", order: 11 },
      },
      {
        id: "a11y",
        type: "topic",
        data: { label: "Accessibility", slug: "accessibility", order: 12 },
      },
      {
        id: "css_layout",
        type: "subtopic",
        parentId: "css",
        data: { label: "Flexbox & Grid", slug: "flexbox-grid", order: 13 },
      },
      {
        id: "css_responsive",
        type: "subtopic",
        parentId: "css",
        data: {
          label: "Responsive design",
          slug: "responsive-design",
          order: 14,
        },
      },
      {
        id: "js_dom",
        type: "subtopic",
        parentId: "javascript",
        data: { label: "DOM & events", slug: "dom-events", order: 15 },
      },
      {
        id: "js_async",
        type: "subtopic",
        parentId: "javascript",
        data: { label: "Async & fetch", slug: "async-fetch", order: 16 },
      },
      {
        id: "state",
        type: "subtopic",
        parentId: "react",
        data: {
          label: "State management",
          slug: "state-management",
          order: 17,
        },
      },
      {
        id: "routing",
        type: "subtopic",
        parentId: "react",
        data: { label: "Routing", slug: "routing", order: 18 },
      },
      {
        id: "e2e",
        type: "subtopic",
        parentId: "testing",
        data: {
          label: "E2E testing",
          slug: "e2e-testing",
          order: 19,
          optional: true,
        },
      },
    ],
    edges: [
      {
        id: "e1",
        source: "fe",
        target: "internet",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e2",
        source: "internet",
        target: "html",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e3",
        source: "html",
        target: "css",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e4",
        source: "css",
        target: "javascript",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e5",
        source: "javascript",
        target: "git",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e6",
        source: "git",
        target: "npm",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e7",
        source: "npm",
        target: "react",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e8",
        source: "react",
        target: "build",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e9",
        source: "build",
        target: "testing",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e10",
        source: "testing",
        target: "security",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e11",
        source: "security",
        target: "perf",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e12",
        source: "perf",
        target: "a11y",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e13",
        source: "css",
        target: "css_layout",
        data: { style: "dashed", kind: "related" },
      },
      {
        id: "e14",
        source: "css",
        target: "css_responsive",
        data: { style: "dashed", kind: "related" },
      },
      {
        id: "e15",
        source: "javascript",
        target: "js_dom",
        data: { style: "dashed", kind: "related" },
      },
      {
        id: "e16",
        source: "javascript",
        target: "js_async",
        data: { style: "dashed", kind: "related" },
      },
      {
        id: "e17",
        source: "react",
        target: "state",
        data: { style: "dashed", kind: "related" },
      },
      {
        id: "e18",
        source: "react",
        target: "routing",
        data: { style: "dashed", kind: "related" },
      },
      {
        id: "e19",
        source: "testing",
        target: "e2e",
        data: { style: "dashed", kind: "related" },
      },
    ],
  },
  topics: [
    {
      nodeId: "internet",
      slug: "internet",
      title: "How the internet works",
      bodyMd:
        "Before writing a line of UI, know what happens when someone visits a page: **DNS** resolves a name to an IP, the browser opens an **HTTP** request over TCP/TLS, and the server responds with HTML. Understanding this round-trip makes debugging and performance work far less mysterious.",
      meta: {
        objectives: [
          "I can explain what happens between typing a URL and seeing a page",
        ],
        est_hours: 3,
      },
      resources: [
        {
          kind: "article",
          title: "How DNS works",
          url: "https://howdns.works/",
        },
        {
          kind: "docs",
          title: "MDN: How the web works",
          url: "https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/How_the_Web_works",
        },
      ],
    },
    {
      nodeId: "html",
      slug: "html",
      title: "HTML",
      bodyMd:
        "HTML is the **structure** of every page. Focus on semantic elements (`header`, `nav`, `main`, `article`) rather than a wall of `div`s — semantics give you accessibility and SEO almost for free.",
      meta: {
        objectives: ["I can build a page with semantic, valid markup"],
        pitfalls: ["Using divs for everything"],
        est_hours: 6,
      },
      resources: [
        {
          kind: "docs",
          title: "MDN: HTML elements reference",
          url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element",
        },
      ],
    },
    {
      nodeId: "css",
      slug: "css",
      title: "CSS",
      bodyMd:
        "CSS controls **presentation**. Learn the box model, the cascade, and specificity first — most CSS confusion is really specificity confusion. Layout (Flexbox/Grid) and responsive design build on top of these fundamentals.",
      meta: {
        objectives: ["I can style a page and reason about the cascade"],
        est_hours: 10,
      },
      resources: [
        {
          kind: "docs",
          title: "MDN: CSS",
          url: "https://developer.mozilla.org/en-US/docs/Web/CSS",
        },
        {
          kind: "course",
          title: "web.dev: Learn CSS",
          url: "https://web.dev/learn/css",
        },
      ],
    },
    {
      nodeId: "javascript",
      slug: "javascript",
      title: "JavaScript",
      bodyMd:
        "JavaScript adds **behavior**. Get comfortable with values and types, functions and closures, and the event loop. Everything a framework does is JavaScript underneath, so time here pays off forever.",
      meta: {
        objectives: [
          "I can manipulate the page and handle events with plain JS",
        ],
        pitfalls: ["Reaching for a framework before knowing the language"],
        est_hours: 20,
      },
      resources: [
        {
          kind: "book",
          title: "Eloquent JavaScript",
          url: "https://eloquentjavascript.net/",
        },
        {
          kind: "docs",
          title: "MDN: JavaScript guide",
          url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
        },
      ],
    },
    {
      nodeId: "git",
      slug: "version-control",
      title: "Version control",
      bodyMd:
        "Git tracks changes and lets you collaborate. Learn `add`, `commit`, `branch`, `merge`, and how to open a pull request — this is table stakes on every team.",
      meta: { est_hours: 5 },
      resources: [
        {
          kind: "docs",
          title: "Pro Git (free book)",
          url: "https://git-scm.com/book/en/v2",
        },
      ],
    },
    {
      nodeId: "npm",
      slug: "package-managers",
      title: "Package managers",
      bodyMd:
        "Package managers (npm, pnpm, yarn) install and version your dependencies. Understand `package.json`, lockfiles, and semver so upgrades don't surprise you.",
      meta: { est_hours: 3 },
    },
    {
      nodeId: "react",
      slug: "frameworks",
      title: "Frameworks",
      bodyMd:
        "A component framework like **React** lets you build UIs from small, reusable pieces and keep them in sync with state. Learn components, props, and hooks — then state management and routing on top.",
      meta: {
        objectives: ["I can build a small app from components and hooks"],
        est_hours: 25,
      },
      resources: [
        { kind: "docs", title: "React docs", url: "https://react.dev/learn" },
      ],
    },
    {
      nodeId: "build",
      slug: "build-tools",
      title: "Build tools",
      bodyMd:
        "Bundlers like **Vite** turn your source into optimized assets the browser can load. You rarely configure them deeply at first — just understand what dev server, build, and preview do.",
      meta: { est_hours: 4 },
    },
    {
      nodeId: "testing",
      slug: "testing",
      title: "Testing",
      bodyMd:
        "Tests keep you fast as the app grows. Start with unit tests for logic and component tests for UI; add end-to-end tests for the critical flows.",
      meta: {
        objectives: ["I can write a component test and a small e2e test"],
        est_hours: 8,
      },
    },
    {
      nodeId: "security",
      slug: "web-security",
      title: "Web security",
      bodyMd:
        "Know the common risks: **XSS**, **CSRF**, and why you never trust input. Sanitize what you render, use HTTPS, and keep secrets off the client.",
      meta: { pitfalls: ["Rendering unsanitized HTML"], est_hours: 5 },
    },
    {
      nodeId: "perf",
      slug: "web-performance",
      title: "Web performance",
      bodyMd:
        "Fast sites convert better and rank higher. Learn the Core Web Vitals, how to measure with Lighthouse, and the biggest wins: image sizing, code-splitting, and caching.",
      meta: { est_hours: 6 },
      resources: [
        {
          kind: "docs",
          title: "web.dev: Learn performance",
          url: "https://web.dev/learn/performance",
        },
      ],
    },
    {
      nodeId: "a11y",
      slug: "accessibility",
      title: "Accessibility",
      bodyMd:
        "Accessible sites work for everyone, including keyboard and screen-reader users. Semantic HTML gets you most of the way; learn focus management, labels, and color contrast for the rest.",
      meta: {
        objectives: [
          "I can audit a page with a keyboard and fix the obvious gaps",
        ],
        est_hours: 5,
      },
    },
    {
      nodeId: "css_layout",
      slug: "flexbox-grid",
      title: "Flexbox & Grid",
      bodyMd:
        "**Flexbox** lays things out in one dimension; **Grid** in two. Together they replace almost every old float/positioning hack. Learn when to reach for each.",
      meta: { est_hours: 4 },
    },
    {
      nodeId: "css_responsive",
      slug: "responsive-design",
      title: "Responsive design",
      bodyMd:
        "Design for every screen with fluid layouts, relative units, and media queries. Prefer intrinsic layouts that reflow naturally over fixed breakpoints.",
      meta: { est_hours: 3 },
    },
    {
      nodeId: "js_dom",
      slug: "dom-events",
      title: "DOM & events",
      bodyMd:
        "The DOM is the live tree of your page. Learn to query nodes, update them, and respond to **events** — the foundation every framework abstracts over.",
      meta: { est_hours: 4 },
    },
    {
      nodeId: "js_async",
      slug: "async-fetch",
      title: "Async & fetch",
      bodyMd:
        "Most real apps talk to a server. Learn Promises, `async`/`await`, and the `fetch` API, plus how to handle loading and error states gracefully.",
      meta: { pitfalls: ["Forgetting error and loading states"], est_hours: 5 },
    },
    {
      nodeId: "state",
      slug: "state-management",
      title: "State management",
      bodyMd:
        "As apps grow, shared state needs a home. Start with local component state and lifting state up; reach for a store (Zustand, Redux) only when prop-drilling hurts.",
      meta: { est_hours: 5 },
    },
    {
      nodeId: "routing",
      slug: "routing",
      title: "Routing",
      bodyMd:
        "Routing maps URLs to views and keeps the back button working. Learn nested routes, params, and how your framework handles data loading per route.",
      meta: { est_hours: 3 },
    },
    {
      nodeId: "e2e",
      slug: "e2e-testing",
      title: "E2E testing",
      bodyMd:
        "End-to-end tests drive a real browser through your critical flows. Tools like Playwright catch the breakages unit tests can't. Nice to have early, essential as you grow.",
      meta: { est_hours: 4 },
    },
  ],
  seo: {
    metaTitle: "Frontend developer roadmap",
    metaDesc:
      "A visual, step-by-step path to becoming a frontend developer — from how the web works to frameworks, testing, and performance.",
    intro_md:
      "A **frontend developer** builds the part of a website people actually see and interact with. The job blends three core technologies — HTML for structure, CSS for presentation, and JavaScript for behavior — with the tooling and practices that turn those into fast, accessible, maintainable apps.\n\nThis roadmap orders those skills so each one builds on the last. You don't need to finish it to be useful; by the time you're comfortable with HTML, CSS, and JavaScript you can already build real things. The later topics — frameworks, testing, performance, accessibility — are what take you from hobby projects to job-ready.",
    faqs: [
      {
        q: "How long does it take to become a frontend developer?",
        a: "With consistent practice, most people reach a job-ready level in six to twelve months. The core (HTML, CSS, JavaScript) comes quickly; the tooling and depth take longer.",
      },
      {
        q: "Do I need a computer science degree?",
        a: "No. Frontend is one of the most portfolio-driven fields — a handful of real projects that show you can build and ship matters more than a degree.",
      },
      {
        q: "Should I learn a framework like React first?",
        a: "Learn plain JavaScript first. Frameworks are JavaScript underneath, and understanding the language makes every framework easier and less magical.",
      },
      {
        q: "Which framework should I learn?",
        a: "React has the largest job market, but the concepts transfer. Pick one, learn it well, and you can move to others later.",
      },
      {
        q: "Is accessibility really necessary?",
        a: "Yes. It's often a legal requirement, it improves SEO, and semantic, accessible markup is simply better markup. Much of it is free if you use HTML properly.",
      },
      {
        q: "How much math do I need?",
        a: "Very little for most frontend work. Logic and problem-solving matter far more than advanced math.",
      },
    ],
  },
};
