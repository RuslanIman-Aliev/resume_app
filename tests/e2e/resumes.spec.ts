import { expect, test } from "@playwright/test";
import { seedResume } from "./fixtures/test-data";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("resumes", () => {
  test("shows seeded resume card", async ({ page }) => {
    await page.goto("/resumes");

    await expect(
      page.getByRole("heading", { name: "Resume Manager" }),
    ).toBeVisible();

    await expect(page.getByText(seedResume.resumeName)).toBeVisible();
    await expect(page.getByText(seedResume.postedRole)).toBeVisible();
    await expect(page.getByText(seedResume.status)).toBeVisible();
  });

  test("opens the upload resume dialog", async ({ page }) => {
    await page.goto("/resumes");

    await page.getByRole("button", { name: "Upload Resume" }).click();

    await expect(
      page.getByRole("heading", { name: "Upload Resume" }),
    ).toBeVisible();
    await expect(
      page.getByText("Drag and drop your resume here"),
    ).toBeVisible();
  });
});
