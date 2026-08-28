import type { JobMatchImprovement } from "./schemas";

const clampScore = (value: number) =>
  Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;

type NormalizeInput = {
  matchScore: number;
  improvements: JobMatchImprovement[];
  estimatedScoreWithAllImprovements: number;
};

type NormalizeResult = {
  improvements: JobMatchImprovement[];
  estimatedScoreWithAllImprovements: number;
};

/**
 * Rescales per-improvement match score boosts so they add up to a gain the
 * score can actually absorb.
 *
 * The model ranks fixes well and does arithmetic badly: asked for a boost per
 * card it hands back 8-15 for every one of a dozen cards, which would take a
 * 62% match past 150%. Its numbers are therefore read as relative weights, and
 * the real budget - the gap between the current score and the score it claims
 * for "everything applied", capped at whatever is left below 100 - is split
 * between them. Largest remainders take the leftover points, so the parts sum
 * to the whole exactly and `estimatedScoreWithAllImprovements` always equals
 * `matchScore` plus the boosts shown on the cards.
 */
export const normalizeMatchScoreBoosts = (
  input: NormalizeInput,
): NormalizeResult => {
  const matchScore = clampScore(input.matchScore);
  const headroom = 100 - matchScore;

  const weights = input.improvements.map((improvement) =>
    Math.max(0, Math.round(improvement.matchScoreBoost ?? 0)),
  );
  const weightSum = weights.reduce((total, weight) => total + weight, 0);

  const claimed = clampScore(input.estimatedScoreWithAllImprovements);
  const claimedGain = Math.max(0, claimed - matchScore);

  // The model's own total is the fallback budget only when it gave no usable
  // estimate; either way the score can never be pushed above 100.
  const budget = Math.min(headroom, claimedGain > 0 ? claimedGain : weightSum);

  if (input.improvements.length === 0 || budget <= 0) {
    return {
      improvements: input.improvements.map((improvement) => ({
        ...improvement,
        matchScoreBoost: 0,
      })),
      estimatedScoreWithAllImprovements: matchScore,
    };
  }

  // An analysis where every card came back as 0 still deserves a split, so fall
  // back to weighting them equally rather than handing out nothing.
  const effectiveWeights = weightSum > 0 ? weights : weights.map(() => 1);
  const effectiveSum = weightSum > 0 ? weightSum : effectiveWeights.length;

  const exactShares = effectiveWeights.map(
    (weight) => (weight * budget) / effectiveSum,
  );
  const boosts = exactShares.map((share) => Math.floor(share));
  let assigned = boosts.reduce((total, boost) => total + boost, 0);

  const byRemainder = exactShares
    .map((share, index) => ({ index, remainder: share - Math.floor(share) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (let step = 0; assigned < budget; step += 1) {
    boosts[byRemainder[step % byRemainder.length].index] += 1;
    assigned += 1;
  }

  return {
    improvements: input.improvements.map((improvement, index) => ({
      ...improvement,
      matchScoreBoost: boosts[index],
    })),
    estimatedScoreWithAllImprovements: matchScore + budget,
  };
};
