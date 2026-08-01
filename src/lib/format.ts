const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/**
 * Converts a date to a human-readable relative time string (e.g., '2 hours ago', 'in 3 days').
 * Uses the Intl.RelativeTimeFormat API for localization.
 * @param date - The date to convert (Date object or ISO string)
 * @returns Human-readable relative time string
 */
export function getRelativeTime(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = then - now;
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);
  const diffMonths = Math.round(diffDays / 30);
  const diffYears = Math.round(diffDays / 365);

  if (Math.abs(diffSecs) < 60) return rtf.format(diffSecs, "second");
  if (Math.abs(diffMins) < 60) return rtf.format(diffMins, "minute");
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, "day");
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, "month");
  return rtf.format(diffYears, "year");
}

/**
 * Maps a numeric score to a Tailwind color class for visual feedback.
 * @param score - Numeric score (0-100)
 * @returns Tailwind text color class ('text-success', 'text-chart-4', or 'text-chart-5')
 */
export function getScoreColor(score: number) {
  if (score >= 85) return "text-success";
  if (score >= 70) return "text-chart-4";
  return "text-chart-5";
}
