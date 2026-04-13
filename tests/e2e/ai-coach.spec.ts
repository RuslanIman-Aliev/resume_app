import { expect, test } from "@playwright/test";
import { seedResume } from "./fixtures/test-data";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("ai coach", () => {
  test("shows resume score and quick wins", async ({ page }) => {
    await page.goto(`/ai-coach/${seedResume.id}`);

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
    await page.goto(`/ai-coach/${seedResume.id}`);

    await page.getByRole("tab", { name: "Improvements" }).click();

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
});
