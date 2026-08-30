import { describe, expect, it } from "vitest";
import {
  ANALYSIS_POLL_TIMEOUT_MS,
  hasAnalysisTimedOut,
} from "./analysis-polling";

const NOW = new Date("2026-08-29T12:00:00Z").getTime();

describe("hasAnalysisTimedOut", () => {
  it("keeps waiting while the run is within the cap", () => {
    const startedAt = new Date(NOW - ANALYSIS_POLL_TIMEOUT_MS + 1000);
    expect(hasAnalysisTimedOut(startedAt, NOW)).toBe(false);
  });

  it("gives up once the run has waited past the cap", () => {
    const startedAt = new Date(NOW - ANALYSIS_POLL_TIMEOUT_MS - 1000);
    expect(hasAnalysisTimedOut(startedAt, NOW)).toBe(true);
  });

  it("accepts the timestamp as a string or epoch number", () => {
    const past = NOW - ANALYSIS_POLL_TIMEOUT_MS - 1000;
    expect(hasAnalysisTimedOut(new Date(past).toISOString(), NOW)).toBe(true);
    expect(hasAnalysisTimedOut(past, NOW)).toBe(true);
  });

  it("never times out without a usable timestamp", () => {
    // Degrades to the previous always-poll behaviour rather than showing a
    // timeout screen for a run that just started.
    expect(hasAnalysisTimedOut(null, NOW)).toBe(false);
    expect(hasAnalysisTimedOut(undefined, NOW)).toBe(false);
    expect(hasAnalysisTimedOut("not a date", NOW)).toBe(false);
  });
});
