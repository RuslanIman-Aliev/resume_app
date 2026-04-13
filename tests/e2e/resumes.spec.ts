import { expect, test } from "@playwright/test";
import { seedResume } from "./fixtures/test-data";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("resumes", () => {
  test("shows seeded resume card", async ({ page }) => {
    await page.goto("/resumes");

    await expect(
      page.getByRole("heading", { name: "Resume Manager" }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByText(new RegExp(seedResume.resumeName, "i")),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(new RegExp(seedResume.postedRole, "i")),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(new RegExp(seedResume.status, "i")),
    ).toBeVisible({
      timeout: 15_000,
    });
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
