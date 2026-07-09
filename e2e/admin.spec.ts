import { test, expect } from "@playwright/test";

test("/admin/ai redirects to /login when signed out", async ({ page }) => {
  await page.goto("/admin/ai");
  await expect(page).toHaveURL(/\/login/);
});

test("/admin/pipeline redirects to /login when signed out", async ({
  page,
}) => {
  await page.goto("/admin/pipeline");
  await expect(page).toHaveURL(/\/login/);
});
