import { afterEach, describe, expect, it, vi } from "vitest";
import { delay } from "./delay";

describe("delay", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves only after the given number of milliseconds", async () => {
    vi.useFakeTimers();
    let resolved = false;
    const promise = delay(500).then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(499);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await promise;
    expect(resolved).toBe(true);
  });
});
