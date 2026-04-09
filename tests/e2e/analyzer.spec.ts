import { expect, test } from "@playwright/test";
import { seedResume } from "./fixtures/test-data";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("analyzer", () => {
  test("enables analysis after resume selection", async ({ page }) => {
    await page.goto("/analyzer");

    await expect(page.getByText("Job Description Input")).toBeVisible();

    const analyzeButton = page.getByRole("button", {
      name: "Analyze Job Description",
    });
    await expect(analyzeButton).toBeDisabled();

    await expect(page.getByText(seedResume.resumeName)).toBeVisible();
    await page.getByText(/frontend engineer/i).click();
    await page
      .getByPlaceholder("Paste the job description here...")
      .fill("Looking for a frontend engineer with React experience.");

    await expect(analyzeButton).toBeEnabled();
  });
});
