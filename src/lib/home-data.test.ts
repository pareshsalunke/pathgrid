import { describe, it, expect } from "vitest";
import { rolePaths, skillPaths, changelog } from "./home-data";

describe("home-data", () => {
  it("exposes non-empty role, skill, and changelog lists", () => {
    expect(rolePaths.length).toBeGreaterThan(0);
    expect(skillPaths.length).toBeGreaterThan(0);
    expect(changelog.length).toBeGreaterThan(0);
  });

  it("keeps slugs unique within each list", () => {
    const roleSlugs = rolePaths.map((r) => r.slug);
    const skillSlugs = skillPaths.map((s) => s.slug);
    expect(new Set(roleSlugs).size).toBe(roleSlugs.length);
    expect(new Set(skillSlugs).size).toBe(skillSlugs.length);
  });

  it("marks Product manager as in-progress and AI engineer as new", () => {
    const pm = rolePaths.find((r) => r.slug === "product-manager");
    const ai = rolePaths.find((r) => r.slug === "ai-engineer");
    expect(pm?.progress).toBe(42);
    expect(ai?.isNew).toBe(true);
  });
});
