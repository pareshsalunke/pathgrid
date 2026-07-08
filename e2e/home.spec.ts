import { test, expect } from "@playwright/test";

test("home renders the hero and primary CTA", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Learn anything. See the whole map." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Generate your roadmap" }),
  ).toBeVisible();
});

test("no horizontal overflow at a 390px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflows).toBe(false);
});
