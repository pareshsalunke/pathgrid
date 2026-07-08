import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders markdown to HTML", async () => {
    const html = await renderMarkdown("# Hi\n\n**bold** and `code`");
    expect(html).toContain("<h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<code>code</code>");
  });

  it("sanitizes dangerous HTML", async () => {
    const html = await renderMarkdown("Hello <script>alert(1)</script> world");
    expect(html).not.toContain("<script>");
    expect(html).toContain("Hello");
  });

  it("returns empty string for empty input", async () => {
    expect(await renderMarkdown("   ")).toBe("");
  });
});
