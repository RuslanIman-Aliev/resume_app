import { expect, test } from "@playwright/test";
import { seedResume } from "./fixtures/test-data";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("dashboard", () => {
  test("shows overview and recent analyses", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("heading", { name: "Application Pipeline" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Recent Analyses" }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByText(new RegExp(seedResume.resumeName, "i")),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/frontend engineer/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("shows quick actions", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Quick Actions" }),
    ).toBeVisible();
    await expect(page.getByText("Analyze Job")).toBeVisible();
    await expect(page.getByText("Upload Resume")).toBeVisible();
    await expect(page.getByText("Tailor Resume")).toBeVisible();
    await expect(page.getByText("Track Application")).toBeVisible();
  });
});
