import { describe, it, expect } from "vitest";
import { changelog } from "./home-data";

describe("home-data", () => {
  it("has non-empty changelog entries with a date and text", () => {
    expect(changelog.length).toBeGreaterThan(0);
    for (const entry of changelog) {
      expect(entry.date).toBeTruthy();
      expect(entry.text).toBeTruthy();
    }
  });
});
