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

export type ScoreBand = {
  /** Lowest score that still belongs to this band. */
  min: number;
  /** One word for the score, shown on the badge. */
  label: string;
  /** Tailwind text color used wherever the number itself is printed. */
  colorClass: string;
  /** Badge styling that matches `colorClass`. */
  badgeClass: string;
  /** What the score means, and what to do about it. */
  summary: string;
};

/**
 * The single table every verdict about a score is read from - the colour of
 * the number, the word on the badge and the sentence under it.
 *
 * It exists because those three used to disagree: the badge said "Good" and
 * the paragraph said "performing well" for every resume, including one scoring
 * 18%, while the number next to them was already red.
 *
 * Ordered high to low; `getScoreBand` takes the first band a score reaches.
 */
export const SCORE_BANDS: readonly ScoreBand[] = [
  {
    min: 85,
    label: "Strong",
    colorClass: "text-success",
    badgeClass: "border-success/40 bg-success/10 text-success",
    summary:
      "This resume is landing well against the role. What follows is polish - small edits that keep it competitive rather than repairs.",
  },
  {
    min: 70,
    label: "Good",
    colorClass: "text-chart-4",
    badgeClass: "border-chart-4/40 bg-chart-4/10 text-chart-4",
    summary:
      "Your resume is performing well but there's room for improvement. Focus on the high-impact suggestions below to increase your score and stand out to recruiters.",
  },
  {
    min: 0,
    label: "Needs work",
    colorClass: "text-chart-5",
    badgeClass: "border-chart-5/40 bg-chart-5/10 text-chart-5",
    summary:
      "This resume is not yet saying what the role asks for. Start at the top of the suggestions below - they are ordered by how much each one moves the score.",
  },
] as const;

/**
 * Resolves a score to its band, clamping anything outside 0-100.
 * @param score - Numeric score, normally 0-100
 * @returns The matching entry from `SCORE_BANDS`
 */
export function getScoreBand(score: number): ScoreBand {
  const clamped = Number.isFinite(score)
    ? Math.min(100, Math.max(0, score))
    : 0;

  // The last band starts at 0, so there is always a match.
  return SCORE_BANDS.find((band) => clamped >= band.min) ?? SCORE_BANDS[2];
}

/**
 * Maps a numeric score to a Tailwind color class for visual feedback.
 * @param score - Numeric score (0-100)
 * @returns Tailwind text color class ('text-success', 'text-chart-4', or 'text-chart-5')
 */
export function getScoreColor(score: number) {
  return getScoreBand(score).colorClass;
}

/**
 * Reduces a free-form value to a lowercase, hyphenated ASCII slug.
 *
 * Returns an empty string when nothing usable is left, which happens for
 * non-latin company names, job titles or resume names - callers are expected to
 * fall back to a generic name in that case rather than emitting a bare
 * extension.
 * @param value - Arbitrary user-supplied text
 * @returns The slug, or an empty string if the value has no ASCII content
 */
export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Renders `resume.postedRole` for display.
 *
 * The field used to be a fixed dropdown that stored slugs (`software-engineer`),
 * and those rows still exist; it is free text now. Slugs are expanded into
 * words, while anything a person typed keeps its own casing - the previous
 * lowercasing turned "Senior QA Engineer" into "Senior qa engineer".
 * @param role - The stored role value.
 * @returns A display label, or an empty string when there is no role.
 */
export function formatRoleLabel(role: string | null | undefined) {
  const value = role?.trim();
  if (!value) return "";

  const isLegacySlug = !value.includes(" ") && value === value.toLowerCase();
  if (!isLegacySlug) return value;

  return value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
