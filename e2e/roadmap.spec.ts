import { test, expect } from "@playwright/test";

// Requires the sample seed (pnpm seed:sample) — Neon persists it.
test("roadmap: open a topic, mark it done, and it persists across reload", async ({
  page,
}) => {
  await page.goto("/frontend-developer");

  // Canvas renders and starts at 0% progress.
  const canvas = page.locator(".react-flow");
  await expect(canvas).toBeVisible();
  await expect(page.getByTestId("progress-pct")).toHaveText("0%");

  // Click a known topic node → drawer opens with that title.
  await canvas.getByText("HTML", { exact: true }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("heading", { name: "HTML" })).toBeVisible();

  // Mark it done, then close the drawer.
  await drawer.getByRole("button", { name: "Done", exact: true }).click();
  await drawer.getByRole("button", { name: "Close" }).click();

  // Progress advanced past 0%.
  await expect(page.getByTestId("progress-pct")).not.toHaveText("0%");
  const pct = await page.getByTestId("progress-pct").textContent();

  // Reload → progress persisted from localStorage.
  await page.reload();
  await expect(page.getByTestId("progress-pct")).toHaveText(pct ?? "");
  expect(pct).not.toBe("0%");
});

test("roadmap: list view toggle renders topics", async ({ page }) => {
  await page.goto("/frontend-developer");
  await page.getByRole("button", { name: "list", exact: true }).click();
  await expect(page.getByRole("button", { name: /CSS/ }).first()).toBeVisible();
});
