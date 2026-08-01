/**
 * Returns border/text/background Tailwind classes for a match-score badge:
 * green when >= 80, red when < 50, yellow otherwise.
 */
export const getMatchScoreBadgeClass = (score: number) => {
  if (score >= 80) return "text-green-500 border-green-500/30 bg-green-500/10";
  if (score < 50) return "text-red-500 border-red-500/30 bg-red-500/10";
  return "text-yellow-500 border-yellow-500/30 bg-yellow-500/10";
};
