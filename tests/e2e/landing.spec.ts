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

    // Level 1 matters: the how-it-works step "Tailor your resume" is an h3
    // with the same words.
    await expect(
      page.getByRole("heading", { level: 1, name: /Tailor your resume/i }),
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
      page.getByRole("link", { name: "Create a free account" }).first(),
    ).toBeVisible();
  });

  // The landing page carries no user counts, ratings or testimonials, and it
  // must stay that way: the numbers that used to sit here were invented, and
  // the page is linked from a CV. These assertions fail if any come back.
  test("makes no unverifiable social-proof claims", async ({ page }) => {
    await page.goto("/");
    await waitForClientReady(page);

    const main = page.locator("main");

    await expect(
      page.getByRole("heading", { name: "Where the project stands" }),
    ).toBeVisible();
    await expect(
      main.getByText(/personal project, built and maintained by one developer/i),
    ).toBeVisible();

    await expect(main).not.toContainText(/50[,.]?000|50K\+/i);
    await expect(main).not.toContainText(/3x faster/i);
    await expect(main).not.toContainText(/interview success rate/i);
    await expect(main).not.toContainText(/average rating/i);
    await expect(main).not.toContainText(/Sarah Chen|Marcus Johnson|Emily Rodriguez/);
    await expect(main).not.toContainText(/Start Free Trial/i);
  });

  test("hero links to the public repository", async ({ page }) => {
    await page.goto("/");
    await waitForClientReady(page);

    const sourceLink = page
      .locator("main")
      .getByRole("link", { name: /Read the source on GitHub/i })
      .first();

    await expect(sourceLink).toBeVisible();
    await expect(sourceLink).toHaveAttribute(
      "href",
      "https://github.com/RuslanIman-Aliev/resume_app",
    );
  });

  test("create a free account navigates to signup", async ({ page }) => {
    await page.goto("/");
    await waitForClientReady(page);

    const signUpHeading = page.getByRole("heading", {
      name: "Create your account",
    });

    if (await signUpHeading.isVisible()) {
      await expect(signUpHeading).toBeVisible({ timeout: 15_000 });
      return;
    }

    const createAccountLink = page
      .locator('main a[href="/signup"]', { hasText: "Create a free account" })
      .first();

    await expect(createAccountLink).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(/\/signup$/, { timeout: 30_000 }),
      createAccountLink.click(),
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
