import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { adminEmails: [] as string[] } }));

import { env } from "@/lib/env";
import { isAdmin } from "./admin";

beforeEach(() => {
  env.adminEmails = [];
});

describe("isAdmin", () => {
  it("is false when the allowlist is empty (locked by default)", () => {
    expect(isAdmin("anyone@example.com")).toBe(false);
  });

  it("is false for a missing email even with a non-empty allowlist", () => {
    env.adminEmails = ["ops@pathgrid.dev"];
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
    expect(isAdmin("")).toBe(false);
  });

  it("matches case-insensitively and trims surrounding whitespace", () => {
    env.adminEmails = ["ops@pathgrid.dev"];
    expect(isAdmin("ops@pathgrid.dev")).toBe(true);
    expect(isAdmin("  OPS@Pathgrid.DEV  ")).toBe(true);
  });

  it("is false for an email not on the list", () => {
    env.adminEmails = ["ops@pathgrid.dev"];
    expect(isAdmin("intruder@evil.com")).toBe(false);
  });
});
