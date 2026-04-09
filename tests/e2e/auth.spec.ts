import { expect, test } from "@playwright/test";

test.describe("auth pages", () => {
  test("sign-in shows validation errors", async ({ page }) => {
    await page.goto("/signin");

    await expect(
      page.getByRole("heading", { name: "Sign in to your account" }),
    ).toBeVisible();

    await page.getByLabel("Email").fill("invalid-email");
    await page.getByLabel("Password").fill("123");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();

    await expect(
      page.getByText("Please enter a valid email address."),
    ).toBeVisible();
    await expect(
      page.getByText("Password must be at least 8 characters."),
    ).toBeVisible();
  });

  test("sign-up shows password mismatch", async ({ page }) => {
    await page.goto("/signup");

    await expect(
      page.getByRole("heading", { name: "Sign up for an account" }),
    ).toBeVisible();

    await page.getByLabel("Name").fill("Test User");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByLabel("Confirm Password").fill("password456");
    await page.getByRole("button", { name: "Sign Up", exact: true }).click();

    await expect(page.getByText("Passwords do not match.")).toBeVisible();
  });

  test("auth pages link to each other", async ({ page }) => {
    await page.goto("/signin");

    await page.getByRole("button", { name: "Sign Up", exact: true }).click();
    await expect(page).toHaveURL(/\/signup$/);

    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(page).toHaveURL(/\/signin$/);
  });
});
