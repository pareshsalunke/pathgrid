import { test, expect } from "@playwright/test";

test("dashboard redirects to /login when signed out", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("login page shows both OAuth providers and the email form", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: /Continue with GitHub/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Continue with Google/ }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("you@work.com")).toBeVisible();
});
