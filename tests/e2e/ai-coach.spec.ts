import { expect, test } from "@playwright/test";
import { seedResume } from "./fixtures/test-data";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("ai coach", () => {
  test("shows resume score and quick wins", async ({ page }) => {
    await page.goto(`/ai-coach/${seedResume.id}`);

    await expect(
      page.getByRole("heading", { name: "AI Career Coach" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Resume Score" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Quick Wins" }),
    ).toBeVisible();

    await expect(page.getByText("Add metrics to achievements")).toBeVisible();
  });

  test("shows improvement suggestions", async ({ page }) => {
    await page.goto(`/ai-coach/${seedResume.id}`);

    await page.getByRole("tab", { name: "Improvements" }).click();

    await expect(
      page.getByRole("heading", { name: "Improvement Suggestions" }),
    ).toBeVisible();
    await expect(page.getByText("Apply This Suggestion")).toBeVisible();
  });
});
