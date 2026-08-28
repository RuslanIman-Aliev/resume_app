import { describe, expect, it } from "vitest";
import { normalizeMatchScoreBoosts } from "./match-score";
import type { JobMatchImprovement } from "./schemas";

const improvement = (matchScoreBoost: number): JobMatchImprovement =>
  ({
    priority: "medium",
    title: "Improvement",
    description: "Description",
    matchScoreBoost,
    suggestions: [],
    targetSection: "summary",
    beforeText: "before",
    afterText: "after",
  }) as JobMatchImprovement;

const sum = (improvements: JobMatchImprovement[]) =>
  improvements.reduce((total, item) => total + item.matchScoreBoost, 0);

describe("normalizeMatchScoreBoosts", () => {
  it("rescales inflated boosts down to the estimated gain", () => {
    const result = normalizeMatchScoreBoosts({
      matchScore: 62,
      estimatedScoreWithAllImprovements: 80,
      improvements: Array.from({ length: 12 }, () => improvement(12)),
    });

    expect(sum(result.improvements)).toBe(18);
    expect(result.estimatedScoreWithAllImprovements).toBe(80);
  });

  it("keeps the estimate and the card boosts in agreement", () => {
    const result = normalizeMatchScoreBoosts({
      matchScore: 45,
      estimatedScoreWithAllImprovements: 71,
      improvements: [improvement(9), improvement(4), improvement(2)],
    });

    expect(45 + sum(result.improvements)).toBe(
      result.estimatedScoreWithAllImprovements,
    );
  });

  it("preserves the model's ranking of which fixes matter most", () => {
    const result = normalizeMatchScoreBoosts({
      matchScore: 50,
      estimatedScoreWithAllImprovements: 70,
      improvements: [improvement(10), improvement(5), improvement(5)],
    });

    const [high, mid, low] = result.improvements.map(
      (item) => item.matchScoreBoost,
    );
    expect(high).toBe(10);
    expect(mid).toBe(5);
    expect(low).toBe(5);
  });

  it("never pushes the score past 100", () => {
    const result = normalizeMatchScoreBoosts({
      matchScore: 94,
      estimatedScoreWithAllImprovements: 130,
      improvements: [improvement(20), improvement(20), improvement(20)],
    });

    expect(result.estimatedScoreWithAllImprovements).toBe(100);
    expect(sum(result.improvements)).toBe(6);
  });

  it("falls back to the raw total when the estimate is missing", () => {
    const result = normalizeMatchScoreBoosts({
      matchScore: 70,
      estimatedScoreWithAllImprovements: 0,
      improvements: [improvement(3), improvement(2)],
    });

    expect(sum(result.improvements)).toBe(5);
    expect(result.estimatedScoreWithAllImprovements).toBe(75);
  });

  it("zeroes every boost once the score is already at 100", () => {
    const result = normalizeMatchScoreBoosts({
      matchScore: 100,
      estimatedScoreWithAllImprovements: 100,
      improvements: [improvement(6), improvement(4)],
    });

    expect(sum(result.improvements)).toBe(0);
    expect(result.estimatedScoreWithAllImprovements).toBe(100);
  });

  it("splits the budget evenly when the model returned no weights", () => {
    const result = normalizeMatchScoreBoosts({
      matchScore: 60,
      estimatedScoreWithAllImprovements: 69,
      improvements: [improvement(0), improvement(0), improvement(0)],
    });

    expect(result.improvements.map((item) => item.matchScoreBoost)).toEqual([
      3, 3, 3,
    ]);
  });

  it("handles an analysis with no improvements", () => {
    const result = normalizeMatchScoreBoosts({
      matchScore: 55,
      estimatedScoreWithAllImprovements: 90,
      improvements: [],
    });

    expect(result.improvements).toEqual([]);
    expect(result.estimatedScoreWithAllImprovements).toBe(55);
  });
});
