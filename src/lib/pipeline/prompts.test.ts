import { describe, it, expect } from "vitest";
import {
  PROMPT_VERSION,
  seedOutlinePrompts,
  topicContentPrompts,
  topicContentSchema,
  resourcePrompts,
  resourceSuggestions,
  seoPrompts,
  critiquePrompts,
  critiqueSchema,
  type CatalogEntry,
} from "./prompts";

const entry: CatalogEntry = {
  slug: "product-manager",
  title: "Product Manager",
  category: "role",
  level: "beginner",
  angle: "zero-to-PM foundation for career switchers",
  brief: "The end-to-end PM foundation path.",
};

describe("seedOutlinePrompts (doc 06 §3.1)", () => {
  it("injects title, category, level and the catalog angle", () => {
    const { system, prompt } = seedOutlinePrompts(entry);
    expect(prompt).toContain("Product Manager");
    expect(prompt).toContain("role, target level: beginner");
    expect(prompt).toContain(entry.angle);
    expect(system).toContain("curriculum designer");
  });

  it("asks for 5-7 stages, a node budget, and JSON only", () => {
    const { prompt } = seedOutlinePrompts(entry);
    expect(prompt).toContain("5-7 stages");
    expect(prompt).toContain("NODE BUDGET");
    expect(prompt).toContain("between 25 and 70");
    expect(prompt).toContain("Return JSON only");
    expect(prompt).toContain('"stages"');
  });
});

describe("topicContentPrompts + schema (doc 06 §3.3)", () => {
  it("names the roadmap, topic, and neighbors (with a none fallback)", () => {
    const { prompt } = topicContentPrompts({
      roadmapTitle: "Product Manager",
      topicTitle: "Discovery",
      nextTitle: "Roadmapping",
    });
    expect(prompt).toContain("Topic: Discovery");
    expect(prompt).toContain("none, Roadmapping");
    expect(prompt).toContain('"est_hours"');
  });

  it("schema accepts a valid payload and rejects a too-short body", () => {
    const valid = {
      body_md: "x".repeat(120),
      objectives: ["I can explain discovery"],
      pitfalls: ["Skipping user interviews"],
      est_hours: 4,
    };
    expect(topicContentSchema.safeParse(valid).success).toBe(true);
    expect(
      topicContentSchema.safeParse({ ...valid, body_md: "too short" }).success,
    ).toBe(false);
    expect(
      topicContentSchema.safeParse({ ...valid, est_hours: 500 }).success,
    ).toBe(false);
  });
});

describe("resourcePrompts + suggestions schema (Policy A)", () => {
  it("caps at 2 suggestions and allows an empty result over guessing", () => {
    const { prompt, system } = resourcePrompts({
      roadmapTitle: "Product Manager",
      topicTitle: "Discovery",
      bodyMd: "b".repeat(600),
    });
    expect(prompt).toContain("at most 2 free resources");
    expect(prompt).toContain('{"resources":[]}');
    expect(system).toContain("Never invent or guess a URL");
    // Body excerpt is truncated so the prompt stays small.
    expect(prompt).not.toContain("b".repeat(501));
  });

  it("schema validates kinds + urls and rejects junk", () => {
    const ok = {
      resources: [
        { kind: "docs", title: "SVPG", url: "https://svpg.com/articles/" },
      ],
    };
    expect(resourceSuggestions.safeParse(ok).success).toBe(true);
    expect(resourceSuggestions.safeParse({ resources: [] }).success).toBe(true);
    expect(
      resourceSuggestions.safeParse({
        resources: [{ kind: "docs", title: "x", url: "not-a-url" }],
      }).success,
    ).toBe(false);
    expect(
      resourceSuggestions.safeParse({
        resources: [{ kind: "podcast", title: "x", url: "https://a.com" }],
      }).success,
    ).toBe(false);
  });
});

describe("seoPrompts (doc 06 §3.4)", () => {
  it("asks for the stored seo shape incl. 6 FAQs, no hype", () => {
    const { prompt, system } = seoPrompts(entry);
    expect(prompt).toContain('"metaTitle"');
    expect(prompt).toContain('"faqs":[6 x');
    expect(system).toContain("no hype");
  });
});

describe("critiquePrompts + schema (doc 06 §4.2)", () => {
  it("lists the problem categories and embeds the digest", () => {
    const { prompt } = critiquePrompts({
      title: "Product Manager",
      digest: "STAGE 1: Foundations — Discovery, Roadmapping",
    });
    expect(prompt).toContain("ordering errors");
    expect(prompt).toContain("missing fundamentals");
    expect(prompt).toContain("STAGE 1: Foundations");
  });

  it("schema accepts findings and an empty list, rejects bad severities", () => {
    expect(
      critiqueSchema.safeParse({
        findings: [{ severity: "high", area: "structure", note: "cycle" }],
      }).success,
    ).toBe(true);
    expect(critiqueSchema.safeParse({ findings: [] }).success).toBe(true);
    expect(
      critiqueSchema.safeParse({
        findings: [{ severity: "fatal", area: "x", note: "y" }],
      }).success,
    ).toBe(false);
  });
});

it("exports a stable prompt version for provenance stamping", () => {
  expect(PROMPT_VERSION).toBe("seed-v1");
});
