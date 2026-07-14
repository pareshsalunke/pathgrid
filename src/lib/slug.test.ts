import { describe, it, expect } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("kebab-cases words and drops punctuation", () => {
    expect(slugify("Headings & Text")).toBe("headings-text");
    expect(slugify("Lists / Links")).toBe("lists-links");
    expect(slugify("  Trim  Me  ")).toBe("trim-me");
    expect(slugify("CSS: The Good Parts!")).toBe("css-the-good-parts");
  });

  it("strips diacritics", () => {
    expect(slugify("Café Résumé")).toBe("cafe-resume");
    expect(slugify("Naïve Über")).toBe("naive-uber");
  });

  it("returns empty for label with no alphanumerics", () => {
    expect(slugify("🚀")).toBe("");
    expect(slugify("")).toBe("");
    expect(slugify("---")).toBe("");
  });

  it("caps length without a trailing hyphen", () => {
    const out = slugify("a ".repeat(60));
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith("-")).toBe(false);
  });
});

describe("uniqueSlug", () => {
  it("returns the base when free", () => {
    expect(uniqueSlug("intro", new Set())).toBe("intro");
  });

  it("appends -2, -3 on collision", () => {
    expect(uniqueSlug("intro", new Set(["intro"]))).toBe("intro-2");
    expect(uniqueSlug("intro", new Set(["intro", "intro-2"]))).toBe("intro-3");
  });

  it("falls back to 'topic' for a blank base", () => {
    expect(uniqueSlug("", new Set())).toBe("topic");
    expect(uniqueSlug("", new Set(["topic"]))).toBe("topic-2");
  });
});
