import { expect, test } from "@playwright/test";
import { budgetedRoutes, seedResume } from "./fixtures/test-data";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("analyzer", () => {
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

  test("keeps analyze button disabled when job description is missing", async ({
    page,
  }) => {
    await gotoWithBudget(page, budgetedRoutes.analyzer);

    const analyzeButton = page.getByRole("button", {
      name: "Analyze Job Description",
    });

    const resumeOption = page.getByText(/frontend engineer/i).first();
    await expect(resumeOption).toBeVisible({ timeout: 15_000 });
    await resumeOption.click();

    await expect(analyzeButton).toBeDisabled();
  });

  test("enables analysis after resume selection", async ({ page }) => {
    await gotoWithBudget(page, budgetedRoutes.analyzer);

    await expect(page.getByText("Job Description Input")).toBeVisible({
      timeout: 15_000,
    });

    const analyzeButton = page.getByRole("button", {
      name: "Analyze Job Description",
    });
    await expect(analyzeButton).toBeDisabled();

    const resumeOption = page.getByText(/frontend engineer/i).first();
    await expect(resumeOption).toBeVisible({ timeout: 15_000 });
    await resumeOption.click();
    await page
      .getByPlaceholder("Paste the job description here...")
      .fill("Looking for a frontend engineer with React experience.");

    await expect(analyzeButton).toBeEnabled();
  });

  test("shows seeded resume details in selector list", async ({ page }) => {
    await gotoWithBudget(page, budgetedRoutes.analyzer);

    await expect(page.getByText(/job description input/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(new RegExp(seedResume.postedRole, "i")),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(new RegExp(seedResume.resumeName, "i")),
    ).toBeVisible({
      timeout: 15_000,
    });
  });
});
