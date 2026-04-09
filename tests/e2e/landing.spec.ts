import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("renders hero and pricing sections", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Land your dream/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Simple, transparent pricing" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Ready to accelerate your job search?",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: "Start Free Trial" }).first(),
    ).toBeVisible();
  });

  test("start free trial navigates to signup", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Start Free Trial" }).first().click();

    await expect(page).toHaveURL(/\/signup$/);
    await expect(
      page.getByRole("heading", { name: "Sign up for an account" }),
    ).toBeVisible();
  });

  test("try analyzer redirects to signup", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Try the Analyzer" }).click();

    await expect(page).toHaveURL(/\/signup$/);
  });
});
