import type { RoadmapFixture } from "./types";

/** Hand-written sample (skill path). Position-less graph — elkjs lays it out. */
export const typescript: RoadmapFixture = {
  slug: "typescript",
  title: "TypeScript",
  brief:
    "Learn TypeScript end to end: from basic types to generics, utility types, and declaration files.",
  category: "skill",
  graph: {
    $schema: "pathgrid/roadmap-graph/v1",
    meta: { title: "TypeScript", level: "mixed", estHours: 40 },
    nodes: [
      { id: "ts", type: "title", data: { label: "TypeScript" } },
      {
        id: "why",
        type: "topic",
        data: { label: "Why TypeScript", slug: "why-typescript", order: 1 },
      },
      {
        id: "setup",
        type: "topic",
        data: { label: "Setup & tsconfig", slug: "setup", order: 2 },
      },
      {
        id: "basic",
        type: "topic",
        data: { label: "Basic types", slug: "basic-types", order: 3 },
      },
      {
        id: "fns",
        type: "topic",
        data: { label: "Functions", slug: "functions", order: 4 },
      },
      {
        id: "ifaces",
        type: "topic",
        data: { label: "Objects & interfaces", slug: "interfaces", order: 5 },
      },
      {
        id: "unions",
        type: "topic",
        data: {
          label: "Unions & narrowing",
          slug: "unions-narrowing",
          order: 6,
        },
      },
      {
        id: "generics",
        type: "topic",
        data: { label: "Generics", slug: "generics", order: 7 },
      },
      {
        id: "utility",
        type: "topic",
        data: { label: "Utility types", slug: "utility-types", order: 8 },
      },
      {
        id: "modules",
        type: "topic",
        data: { label: "Modules", slug: "modules", order: 9 },
      },
      {
        id: "async",
        type: "topic",
        data: { label: "Typing async code", slug: "async", order: 10 },
      },
      {
        id: "decl",
        type: "topic",
        data: {
          label: "Declaration files",
          slug: "declaration-files",
          order: 11,
        },
      },
      {
        id: "literal",
        type: "subtopic",
        parentId: "basic",
        data: { label: "Literal types", slug: "literal-types", order: 12 },
      },
      {
        id: "guards",
        type: "subtopic",
        parentId: "unions",
        data: { label: "Type guards", slug: "type-guards", order: 13 },
      },
      {
        id: "constraints",
        type: "subtopic",
        parentId: "generics",
        data: {
          label: "Generic constraints",
          slug: "generic-constraints",
          order: 14,
        },
      },
      {
        id: "mapped",
        type: "subtopic",
        parentId: "utility",
        data: {
          label: "Mapped types",
          slug: "mapped-types",
          order: 15,
          optional: true,
        },
      },
    ],
    edges: [
      {
        id: "e1",
        source: "ts",
        target: "why",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e2",
        source: "why",
        target: "setup",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e3",
        source: "setup",
        target: "basic",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e4",
        source: "basic",
        target: "fns",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e5",
        source: "fns",
        target: "ifaces",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e6",
        source: "ifaces",
        target: "unions",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e7",
        source: "unions",
        target: "generics",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e8",
        source: "generics",
        target: "utility",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e9",
        source: "utility",
        target: "modules",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e10",
        source: "modules",
        target: "async",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e11",
        source: "async",
        target: "decl",
        data: { style: "solid", kind: "sequence" },
      },
      {
        id: "e12",
        source: "basic",
        target: "literal",
        data: { style: "dashed", kind: "related" },
      },
      {
        id: "e13",
        source: "unions",
        target: "guards",
        data: { style: "dashed", kind: "related" },
      },
      {
        id: "e14",
        source: "generics",
        target: "constraints",
        data: { style: "dashed", kind: "related" },
      },
      {
        id: "e15",
        source: "utility",
        target: "mapped",
        data: { style: "dashed", kind: "related" },
      },
    ],
  },
  topics: [
    {
      nodeId: "why",
      slug: "why-typescript",
      title: "Why TypeScript",
      bodyMd:
        "TypeScript is JavaScript with **static types**. The payoff is catching a whole class of bugs at your desk instead of in production, plus editor autocomplete that actually knows your data. It compiles away to plain JavaScript, so there's no runtime cost.",
      meta: {
        objectives: ["I can explain what problems types solve"],
        est_hours: 1,
      },
      resources: [
        {
          kind: "docs",
          title: "TypeScript for JS programmers",
          url: "https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html",
        },
      ],
    },
    {
      nodeId: "setup",
      slug: "setup",
      title: "Setup & tsconfig",
      bodyMd:
        "Install the compiler and create a `tsconfig.json`. The most important flag is **`strict`** — turn it on from day one; loosening later is easy, tightening later is painful.",
      meta: { pitfalls: ["Skipping strict mode"], est_hours: 2 },
    },
    {
      nodeId: "basic",
      slug: "basic-types",
      title: "Basic types",
      bodyMd:
        "Start with `string`, `number`, `boolean`, arrays, and `object`. Prefer letting TypeScript **infer** types over annotating everything — annotate the boundaries (function signatures), infer the middle.",
      meta: {
        objectives: ["I can type variables and let inference do the rest"],
        est_hours: 3,
      },
      resources: [
        {
          kind: "docs",
          title: "Everyday Types",
          url: "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html",
        },
      ],
    },
    {
      nodeId: "fns",
      slug: "functions",
      title: "Functions",
      bodyMd:
        "Type your function parameters and return values. Learn optional and default parameters, rest params, and how to type callbacks — the return type is usually best left inferred.",
      meta: { est_hours: 2 },
    },
    {
      nodeId: "ifaces",
      slug: "interfaces",
      title: "Objects & interfaces",
      bodyMd:
        "Describe object shapes with `interface` or `type`. They're mostly interchangeable; pick one style and stay consistent. Learn optional properties, readonly, and index signatures.",
      meta: { est_hours: 3 },
    },
    {
      nodeId: "unions",
      slug: "unions-narrowing",
      title: "Unions & narrowing",
      bodyMd:
        "A **union** (`A | B`) says a value is one of several types. **Narrowing** is how you safely work with it — TypeScript follows your `if` checks to figure out which type you have in each branch.",
      meta: {
        objectives: ["I can model 'one of these' and narrow it safely"],
        est_hours: 3,
      },
    },
    {
      nodeId: "generics",
      slug: "generics",
      title: "Generics",
      bodyMd:
        "Generics let a function or type work over **any** type while keeping the relationship between inputs and outputs. `Array<T>` is the classic example. They feel abstract at first but click with practice.",
      meta: {
        pitfalls: ["Over-using generics where a plain type would do"],
        est_hours: 4,
      },
      resources: [
        {
          kind: "docs",
          title: "Generics",
          url: "https://www.typescriptlang.org/docs/handbook/2/generics.html",
        },
      ],
    },
    {
      nodeId: "utility",
      slug: "utility-types",
      title: "Utility types",
      bodyMd:
        "Built-ins like `Partial`, `Pick`, `Omit`, and `Record` transform existing types so you don't repeat yourself. Learn the common ones — they show up everywhere in real code.",
      meta: { est_hours: 2 },
    },
    {
      nodeId: "modules",
      slug: "modules",
      title: "Modules",
      bodyMd:
        "Learn `import`/`export`, how module resolution works, and the difference between type-only and value imports (`import type`). This keeps your build fast and your bundles clean.",
      meta: { est_hours: 2 },
    },
    {
      nodeId: "async",
      slug: "async",
      title: "Typing async code",
      bodyMd:
        "Async functions return `Promise<T>`. Learn to type awaited values, handle errors with typed `catch` blocks, and validate data crossing the network boundary (types don't exist at runtime).",
      meta: { pitfalls: ["Trusting `any` from an API response"], est_hours: 3 },
    },
    {
      nodeId: "decl",
      slug: "declaration-files",
      title: "Declaration files",
      bodyMd:
        "`.d.ts` files describe the types of JavaScript that has none. Most libraries ship their own or have a `@types/*` package; occasionally you'll write a small one yourself.",
      meta: { est_hours: 2 },
    },
    {
      nodeId: "literal",
      slug: "literal-types",
      title: "Literal types",
      bodyMd:
        "A literal type is an exact value, like `\"role\"` or `42`. Combined with unions they model precise sets — `'sm' | 'md' | 'lg'` is far safer than a bare `string`.",
      meta: { est_hours: 1 },
    },
    {
      nodeId: "guards",
      slug: "type-guards",
      title: "Type guards",
      bodyMd:
        "Type guards are checks that narrow a type — `typeof`, `instanceof`, `in`, and custom `x is T` functions. They're how you turn an `unknown` or a union into something you can safely use.",
      meta: { est_hours: 2 },
    },
    {
      nodeId: "constraints",
      slug: "generic-constraints",
      title: "Generic constraints",
      bodyMd:
        "`<T extends { id: string }>` restricts a generic so you can rely on some shape while staying flexible. Constraints are what make generics practical instead of just abstract.",
      meta: { est_hours: 2 },
    },
    {
      nodeId: "mapped",
      slug: "mapped-types",
      title: "Mapped types",
      bodyMd:
        "Mapped types build new types by transforming each property of another — this is how `Partial` and `Readonly` are implemented. Advanced, but powerful once you need it. Nice to know rather than day-one essential.",
      meta: { est_hours: 2 },
    },
  ],
  seo: {
    metaTitle: "TypeScript roadmap",
    metaDesc:
      "A visual path through TypeScript — from basic types and interfaces to generics, utility types, and declaration files.",
    intro_md:
      "**TypeScript** is a typed superset of JavaScript: every JavaScript program is already valid TypeScript, and you layer types on top to catch mistakes before they run. It compiles to plain JavaScript, so it runs anywhere JavaScript does — the types are purely a development-time tool.\n\nThis roadmap moves from the essentials (basic types, functions, interfaces) through the ideas that make TypeScript powerful (unions, generics, utility types) and finishes with the pieces you meet in real projects (modules, async typing, declaration files). Turn on `strict` mode early and let the compiler teach you.",
    faqs: [
      {
        q: "Do I need to know JavaScript before TypeScript?",
        a: "Yes. TypeScript is JavaScript plus types, so comfort with the language — functions, objects, async — comes first. The types make more sense once the underlying JavaScript does.",
      },
      {
        q: "Does TypeScript make my app slower?",
        a: "No. Types are erased at compile time; the JavaScript that runs in the browser has zero type-checking overhead.",
      },
      {
        q: "Should I annotate every variable?",
        a: "No. Annotate boundaries like function parameters and public APIs, and let inference handle the rest. Over-annotating adds noise without adding safety.",
      },
      {
        q: "interface or type — which should I use?",
        a: "They overlap heavily. A common convention is interfaces for object shapes you might extend and type aliases for unions and utilities, but consistency matters more than the choice.",
      },
      {
        q: "What is strict mode?",
        a: "A group of compiler flags that catch more mistakes, most notably null-safety. Enable it from the start of a project — retrofitting it later is much harder.",
      },
      {
        q: "Are generics worth learning early?",
        a: "Learn to use generic types like Array and Promise early; writing your own can wait until you feel the repetition that generics remove.",
      },
    ],
  },
};
