import { expect, test, type Page } from "@playwright/test";

const waitForClientReady = async (page: Page) => {
  await expect(page.getByText(/Compiling|Rendering/)).toHaveCount(0, {
    timeout: 30_000,
  });
};

test.describe("auth pages", () => {
  test("sign-in shows validation errors", async ({ page }) => {
    await page.goto("/signin");
    await waitForClientReady(page);

    await expect(
      page.getByText("Sign in to your account", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByLabel("Email").fill("invalid-email");
    await page.getByLabel(/^Password$/).fill("123");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();

    await expect(page).toHaveURL(/\/signin$/, { timeout: 15_000 });
  });

  test("sign-up shows password mismatch", async ({ page }) => {
    await page.goto("/signup");
    await waitForClientReady(page);

    await expect(
      page.getByText("Sign up for an account", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByLabel("Name").fill("Test User");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel(/^Password$/).fill("password123");
    await page.getByLabel(/^Confirm Password$/).fill("password456");
    await page.getByRole("button", { name: "Sign Up", exact: true }).click();

    await expect(page.getByText("Passwords do not match.")).toBeVisible();
  });

  test("auth pages link to each other", async ({ page }) => {
    await page.goto("/signin");
    await waitForClientReady(page);

    await page.getByRole("button", { name: "Sign Up", exact: true }).click();
    await expect(
      page.getByText("Sign up for an account", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(
      page.getByText("Sign in to your account", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
