import { test, expect } from "@playwright/test";

test("AI hub renders anonymously with the create form and login CTA", async ({
  page,
}) => {
  await page.goto("/ai");
  await expect(
    page.getByRole("heading", { name: "Describe what you want to learn" }),
  ).toBeVisible();
  // Rail modes present
  await expect(page.getByRole("button", { name: "Course plan" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quiz" })).toBeVisible();
  // Anonymous gating: session resolves client-side → login CTA replaces generate
  await expect(
    page.getByRole("link", { name: "Log in to generate" }),
  ).toBeVisible();
});

test("?goal= prefills the create form", async ({ page }) => {
  await page.goto("/ai?goal=Learn%20Rust");
  await expect(page.getByLabel("Your goal")).toHaveValue("Learn Rust");
});

test("rail mode switch is interactive (hydration works)", async ({ page }) => {
  await page.goto("/ai");
  await page.getByRole("button", { name: "Course plan" }).click();
  await expect(
    page.getByRole("heading", { name: "Turn a goal into a weekly plan" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Roadmap", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Describe what you want to learn" }),
  ).toBeVisible();
});

test("generated-roadmap viewer redirects to /login when signed out", async ({
  page,
}) => {
  await page.goto("/ai/roadmap/00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL(/\/login/);
});

test("tutor chat redirects to /login when signed out, preserving context params", async ({
  page,
}) => {
  await page.goto("/ai/chat?roadmap=00000000-0000-0000-0000-000000000000&q=hi");
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  expect(page.url()).toContain(encodeURIComponent("/ai/chat?roadmap="));
});

test("tutor chat thread page redirects to /login when signed out", async ({
  page,
}) => {
  await page.goto("/ai/chat/00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL(/\/login/);
});
