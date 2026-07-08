import { describe, it, expect } from "vitest";
import { mergeStatuses } from "./progress";

describe("mergeStatuses", () => {
  it("never downgrades done", () => {
    expect(mergeStatuses("done", "pending")).toBe("done");
    expect(mergeStatuses("pending", "done")).toBe("done");
    expect(mergeStatuses("done", "learning")).toBe("done");
    expect(mergeStatuses("learning", "done")).toBe("done");
  });

  it("takes the higher rank (pending < skipped < learning < done)", () => {
    expect(mergeStatuses("skipped", "learning")).toBe("learning");
    expect(mergeStatuses("pending", "skipped")).toBe("skipped");
    expect(mergeStatuses("learning", "skipped")).toBe("learning");
  });

  it("treats undefined as pending", () => {
    expect(mergeStatuses(undefined, "done")).toBe("done");
    expect(mergeStatuses("learning", undefined)).toBe("learning");
    expect(mergeStatuses(undefined, undefined)).toBe("pending");
  });
});
