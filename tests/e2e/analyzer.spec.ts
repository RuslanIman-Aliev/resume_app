import { expect, test } from "@playwright/test";
import { seedResume } from "./fixtures/test-data";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("analyzer", () => {
  test("enables analysis after resume selection", async ({ page }) => {
    await page.goto("/analyzer");

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
});
