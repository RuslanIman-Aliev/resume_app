import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimit } from "./rate-limit";

const OPTIONS = { limit: 3, windowMs: 1000 };

describe("rateLimit", () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it("allows hits up to the limit and reports remaining", () => {
    expect(rateLimit("user", { ...OPTIONS, now: 0 })).toMatchObject({
      success: true,
      remaining: 2,
    });
    expect(rateLimit("user", { ...OPTIONS, now: 10 })).toMatchObject({
      success: true,
      remaining: 1,
    });
    expect(rateLimit("user", { ...OPTIONS, now: 20 })).toMatchObject({
      success: true,
      remaining: 0,
    });
  });

  it("blocks the hit that exceeds the limit within the window", () => {
    rateLimit("user", { ...OPTIONS, now: 0 });
    rateLimit("user", { ...OPTIONS, now: 0 });
    rateLimit("user", { ...OPTIONS, now: 0 });

    const blocked = rateLimit("user", { ...OPTIONS, now: 100 });
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    // oldest hit was at 0, window is 1000, so retry becomes available at 1000.
    expect(blocked.retryAfterMs).toBe(900);
  });

  it("does not record blocked hits, so the window drains cleanly", () => {
    rateLimit("user", { ...OPTIONS, now: 0 });
    rateLimit("user", { ...OPTIONS, now: 0 });
    rateLimit("user", { ...OPTIONS, now: 0 });
    // Blocked at 500 — must not consume a slot.
    expect(rateLimit("user", { ...OPTIONS, now: 500 }).success).toBe(false);

    // At 1001 the three original hits (t=0) have expired, so we start fresh.
    expect(rateLimit("user", { ...OPTIONS, now: 1001 })).toMatchObject({
      success: true,
      remaining: 2,
    });
  });

  it("expires hits outside the window (sliding window)", () => {
    rateLimit("user", { ...OPTIONS, now: 0 });
    rateLimit("user", { ...OPTIONS, now: 400 });
    rateLimit("user", { ...OPTIONS, now: 800 });
    // At 1200 the t=0 hit expired (window (200, 1200]) but 400 and 800 remain.
    expect(rateLimit("user", { ...OPTIONS, now: 1200 })).toMatchObject({
      success: true,
      remaining: 0,
    });
    // Now 4 within-window would exceed the limit of 3.
    expect(rateLimit("user", { ...OPTIONS, now: 1201 }).success).toBe(false);
  });

  it("tracks keys independently", () => {
    rateLimit("a", { ...OPTIONS, now: 0 });
    rateLimit("a", { ...OPTIONS, now: 0 });
    rateLimit("a", { ...OPTIONS, now: 0 });
    expect(rateLimit("a", { ...OPTIONS, now: 0 }).success).toBe(false);
    // A different key is unaffected.
    expect(rateLimit("b", { ...OPTIONS, now: 0 }).success).toBe(true);
  });

  it("resets a single key without touching others", () => {
    rateLimit("a", { ...OPTIONS, now: 0 });
    rateLimit("a", { ...OPTIONS, now: 0 });
    rateLimit("a", { ...OPTIONS, now: 0 });
    rateLimit("b", { ...OPTIONS, now: 0 });

    resetRateLimit("a");

    expect(rateLimit("a", { ...OPTIONS, now: 0 }).success).toBe(true);
    // "b" still has one recorded hit → two remaining.
    expect(rateLimit("b", { ...OPTIONS, now: 0 }).remaining).toBe(1);
  });
});
