import { test, expect } from "@playwright/test";

// The editor is owner-only; Playwright has no auth fixture, so the testable
// contract is the signed-out redirect (auth() gate runs before the DB lookup).
test("editor redirects to /login when signed out, preserving the return path", async ({
  page,
}) => {
  await page.goto("/editor/00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL(/\/login\?callbackUrl=.*editor/);
});
