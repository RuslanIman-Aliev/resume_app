import { expect, test } from "@playwright/test";

const protectedRoutes = [
  "/dashboard",
  "/resumes",
  "/analyzer",
  "/tracker",
  "/ai-coach/demo",
];

for (const route of protectedRoutes) {
  test(`redirects unauthenticated users from ${route}`, async ({ page }) => {
    await page.goto(route);

    await expect(page).toHaveURL(/\/signup$/);
    await expect(
      page.getByRole("heading", { name: "Sign up for an account" }),
    ).toBeVisible();
  });
}
