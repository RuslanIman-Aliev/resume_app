import { expect, test, type Page } from "@playwright/test";

const waitForClientReady = async (page: Page) => {
  await expect(page.getByText(/Compiling|Rendering/)).toHaveCount(0, {
    timeout: 30_000,
  });
};

test.describe("landing page", () => {
  test("renders hero and pricing sections", async ({ page }) => {
    await page.goto("/");
    await waitForClientReady(page);

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
    await waitForClientReady(page);

    const signUpHeading = page.getByRole("heading", {
      name: "Create your account",
    });

    if (await signUpHeading.isVisible()) {
      await expect(signUpHeading).toBeVisible({ timeout: 15_000 });
      return;
    }

    const startFreeTrialLink = page
      .locator('main a[href="/signup"]', { hasText: "Start Free Trial" })
      .first();

    await expect(startFreeTrialLink).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(/\/signup$/, { timeout: 30_000 }),
      startFreeTrialLink.click(),
    ]);

    await expect(signUpHeading).toBeVisible({ timeout: 30_000 });
  });

  // test("try analyzer redirects to signup", async ({ page }) => {
  //   await page.goto("/");
  //   await waitForClientReady(page);

  //   await Promise.all([
  //     page.waitForURL(/\/signup$/),
  //     page.getByRole("link", { name: "Try the Analyzer" }).click(),
  //   ]);
  // });
});
