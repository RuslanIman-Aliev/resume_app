import { expect, test } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("tracker", () => {
  test("shows tracker overview", async ({ page }) => {
    await page.goto("/tracker");

    await expect(
      page.getByRole("heading", { name: "Application Tracker" }),
    ).toBeVisible();
    await expect(page.getByText("Total")).toBeVisible();
    await expect(page.getByRole("heading", { name: /saved/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add Application" }),
    ).toBeVisible();
  });
});
