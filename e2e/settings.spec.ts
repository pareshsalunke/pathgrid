import { test, expect } from "@playwright/test";

test("settings redirects to /login when signed out", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login/);
});
