import { expect, test } from "@playwright/test";
import { budgetedRoutes } from "./fixtures/test-data";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("ai coach", () => {
  const MAX_NAV_TIME_MS = 10_000;

  const gotoWithBudget = async (
    page: import("@playwright/test").Page,
    url: string,
  ) => {
    const startedAt = Date.now();
    await page.goto(url);
    const duration = Date.now() - startedAt;
    expect(duration).toBeLessThan(MAX_NAV_TIME_MS);
  };

  /**
   * The tabs render server-side, so a click can land before React hydrates and
   * be dropped. Retry until the tab reports itself selected.
   */
  const openTab = async (
    page: import("@playwright/test").Page,
    name: string,
  ) => {
    const tab = page.getByRole("tab", { name });
    await expect(async () => {
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true", {
        timeout: 1_000,
      });
    }).toPass({ timeout: 15_000 });
  };

  test("shows resume score and quick wins", async ({ page }) => {
    await gotoWithBudget(page, budgetedRoutes.aiCoach);

    await expect(
      page.getByRole("heading", { name: "AI Career Coach" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Resume Score" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Quick Wins" })).toBeVisible(
      { timeout: 15_000 },
    );

    await expect(page.getByText("Add metrics to achievements")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("shows improvement suggestions", async ({ page }) => {
    await gotoWithBudget(page, budgetedRoutes.aiCoach);

    await openTab(page, "Improvements");

    await expect(
      page.getByRole("heading", { name: "Improvement Suggestions" }),
    ).toBeVisible({ timeout: 15_000 });

    await page
      .getByRole("button", { name: /Strengthen the summary for the role/i })
      .click();
    await expect(page.getByText("Apply This Suggestion")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("shows improvements filter controls", async ({ page }) => {
    await gotoWithBudget(page, budgetedRoutes.aiCoach);

    await openTab(page, "Improvements");

    await expect(page.getByRole("button", { name: "All" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("button", { name: "High Impact" }).first(),
    ).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "High Impact" }).first().click();
    await expect(
      page.getByRole("heading", { name: "Improvement Suggestions" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "All" }).click();

    await expect(
      page.getByText(/^\d+ suggestions to improve your resume$/i),
    ).toBeVisible();
  });
});
