import { expect, test, type Locator, type Page } from "@playwright/test";
import { seedTrackerPositions } from "./fixtures/test-data";

test.use({ storageState: "tests/e2e/.auth/user.json" });

const column = (page: Page, status: string) =>
  page.getByTestId(`kanban-column-${status}`);

const dragHandle = (page: Page, company: string, position: string) =>
  page.getByRole("button", { name: `Move ${position} at ${company}` });

const actionsMenu = (page: Page, company: string, position: string) =>
  page.getByRole("button", { name: `Actions for ${position} at ${company}` });

/** dnd-kit's announcement live region - the drag's own progress commentary. */
const announcer = (page: Page) => page.locator('[role="status"]').first();

/**
 * Resolves once the status mutation has actually reached the server.
 *
 * The board updates optimistically, so the card is in its new column long
 * before the write lands. Reloading on that alone would abort the request in
 * flight and test nothing.
 */
const waitForStatusWrite = (page: Page) =>
  page.waitForResponse(
    (response) =>
      response.url().includes("tracker.updateStatus") &&
      response.request().method() === "POST",
  );

/**
 * Adds an application through the dialog and returns its unique company name.
 *
 * Each test makes its own card rather than moving a seeded one, so a retry
 * doesn't inherit the status a previous attempt already committed.
 */
const addApplication = async (page: Page, position: string) => {
  const company = `Drag Co ${Date.now()}`;

  await page.getByRole("button", { name: "Add Application" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Company Name").fill(company);
  await dialog.getByLabel("Position", { exact: true }).fill(position);
  await dialog.getByRole("button", { name: "Add Application" }).click();

  await expect(dragHandle(page, company, position)).toBeVisible({
    timeout: 15_000,
  });

  return company;
};

/**
 * Drags with explicit pointer steps instead of `dragTo`.
 *
 * dnd-kit listens for pointer events and only arms after the 8px activation
 * distance, so a single jump from source to target never starts a drag.
 */
const dragCardTo = async (page: Page, handle: Locator, target: Locator) => {
  const from = await handle.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("drag source or target is not on screen");

  const startX = from.x + from.width / 2;
  const startY = from.y + from.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Cross the activation distance first, then travel to the target.
  await page.mouse.move(startX + 20, startY, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + 40, { steps: 25 });
  await page.mouse.move(to.x + to.width / 2, to.y + 50, { steps: 5 });
  await page.mouse.up();
};

/**
 * The same drag with a finger.
 *
 * Playwright's touchscreen only taps, so the touch stream goes through CDP.
 * This is the case that native HTML5 drag-and-drop cannot serve at all, and
 * the one the handle's `touch-action: none` exists for - without it the
 * browser claims the gesture and pans the page instead.
 */
const touchDragCardTo = async (page: Page, handle: Locator, target: Locator) => {
  const from = await handle.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("drag source or target is not on screen");

  const cdp = await page.context().newCDPSession(page);
  const startX = from.x + from.width / 2;
  const startY = from.y + from.height / 2;
  const endX = Math.min(to.x + to.width / 2, page.viewportSize()!.width - 30);
  const endY = to.y + 40;

  const touch = (
    type: "touchStart" | "touchMove" | "touchEnd",
    x?: number,
    y?: number,
  ) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: x === undefined ? [] : [{ x, y: y ?? 0 }],
    });

  await touch("touchStart", startX, startY);
  for (let step = 1; step <= 20; step += 1) {
    await touch(
      "touchMove",
      startX + ((endX - startX) * step) / 20,
      startY + ((endY - startY) * step) / 20,
    );
  }
  await touch("touchEnd");
  await cdp.detach();
};

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

  test("scrolls a full column instead of paginating it", async ({ page }) => {
    await page.goto("/tracker");

    const saved = column(page, "saved");
    await expect(saved).toBeVisible({ timeout: 15_000 });

    // Every seeded card is mounted at once - nothing is held back on a page 2.
    // `exact` matters here: "Column Co 1" is a substring of "Column Co 10".
    for (const seeded of seedTrackerPositions) {
      await expect(
        saved.getByText(seeded.company, { exact: true }),
      ).toHaveCount(1);
    }

    await expect(page.getByRole("button", { name: /^next$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^prev$/i })).toHaveCount(0);
    await expect(page.getByText(/page \d+ of \d+/i)).toHaveCount(0);

    // The column is a scroller: its content is taller than the box showing it.
    const overflows = await saved.evaluate(
      (element) => element.scrollHeight > element.clientHeight + 1,
    );
    expect(overflows).toBe(true);

    // And it actually scrolls, so the cards past the fold are reachable.
    await saved.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect
      .poll(async () => saved.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
  });

  test("moves a card between columns by dragging", async ({ page }) => {
    const position = "Pointer Drag Engineer";
    await page.goto("/tracker");
    const company = await addApplication(page, position);

    await expect(column(page, "saved").getByText(company)).toBeVisible();

    const written = waitForStatusWrite(page);
    await dragCardTo(
      page,
      dragHandle(page, company, position),
      column(page, "applied"),
    );

    await expect(column(page, "applied").getByText(company)).toBeVisible({
      timeout: 15_000,
    });
    await expect(column(page, "saved").getByText(company)).toHaveCount(0);

    // The move went to the server, not just the cache.
    expect((await written).status()).toBe(200);
    await page.reload();
    await expect(column(page, "applied").getByText(company)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("moves a card between columns with the keyboard", async ({ page }) => {
    const position = "Keyboard Drag Engineer";
    await page.goto("/tracker");
    const company = await addApplication(page, position);

    const written = waitForStatusWrite(page);

    await dragHandle(page, company, position).focus();

    // Each keystroke waits for the announcement it causes. A keyboard drag is
    // stateful - firing the three keys back to back gets ArrowRight in before
    // the sensor has armed, and the card never leaves its column.
    await page.keyboard.press("Space");
    await expect(announcer(page)).toContainText(company);

    await page.keyboard.press("ArrowRight");
    await expect(announcer(page)).toContainText("is over Applied");

    await page.keyboard.press("Space");
    await expect(announcer(page)).toContainText("was moved to Applied");

    await expect(column(page, "applied").getByText(company)).toBeVisible({
      timeout: 15_000,
    });

    expect((await written).status()).toBe(200);
    await page.reload();
    await expect(column(page, "applied").getByText(company)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("still opens a card's details, and a press without movement is not a drag", async ({
    page,
  }) => {
    const position = "Open Details Engineer";
    await page.goto("/tracker");
    const company = await addApplication(page, position);

    // Press and release on the handle with no movement: below the 8px
    // activation distance, so this has to stay a click, not a drag.
    const handleBox = (await dragHandle(page, company, position).boundingBox())!;
    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.up();
    await expect(column(page, "saved").getByText(company)).toBeVisible();

    await actionsMenu(page, company, position).click();
    await page.getByRole("menuitem", { name: "Show Info" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Company Name")).toHaveValue(company);
  });

  test("still moves a card with the status dropdown", async ({ page }) => {
    const position = "Dropdown Move Engineer";
    await page.goto("/tracker");
    const company = await addApplication(page, position);

    const written = waitForStatusWrite(page);
    await actionsMenu(page, company, position).click();
    await page.getByRole("menuitem", { name: "Interview" }).click();

    await expect(column(page, "interview").getByText(company)).toBeVisible({
      timeout: 15_000,
    });

    expect((await written).status()).toBe(200);
    await page.reload();
    await expect(column(page, "interview").getByText(company)).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("tracker on a phone", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("moves a card between columns with a finger", async ({ page }) => {
    const position = "Touch Drag Engineer";
    await page.goto("/tracker");
    const company = await addApplication(page, position);

    const written = waitForStatusWrite(page);
    await touchDragCardTo(
      page,
      dragHandle(page, company, position),
      column(page, "applied"),
    );

    await expect(column(page, "applied").getByText(company)).toBeVisible({
      timeout: 15_000,
    });

    expect((await written).status()).toBe(200);
    await page.reload();
    await expect(column(page, "applied").getByText(company)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("still scrolls the column by touch away from the handle", async ({
    page,
  }) => {
    await page.goto("/tracker");

    const saved = column(page, "saved");
    await expect(saved).toBeVisible({ timeout: 15_000 });

    // `touch-action: none` is confined to the handle. If it ever spread to the
    // card or the column, the finger would move cards but stop scrolling them.
    await expect(page.getByRole("button", { name: /^Move / }).first()).toHaveCSS(
      "touch-action",
      "none",
    );
    expect(
      await saved.evaluate((element) => getComputedStyle(element).touchAction),
    ).not.toBe("none");

    // And it is a real scroller at phone size, not a box that merely clips.
    // Driven by the wheel rather than a synthesized touch gesture: headless
    // Chromium doesn't route those to the compositor, so a swipe here would
    // pass whether or not the column could scroll. The `touch-action` check
    // above is what pins the finger behaviour.
    await saved.scrollIntoViewIfNeeded();
    const box = (await saved.boundingBox())!;
    const viewport = page.viewportSize()!;
    const visibleTop = Math.max(box.y, 0);
    const visibleBottom = Math.min(box.y + box.height, viewport.height);

    await page.mouse.move(
      Math.min(box.x + box.width - 20, viewport.width - 10),
      (visibleTop + visibleBottom) / 2,
    );
    await page.mouse.wheel(0, 200);

    await expect
      .poll(async () => saved.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
  });
});
