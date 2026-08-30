/**
 * How the client waits for a background analysis, and when it gives up.
 *
 * Both analysis pages poll while a run is in flight because the Pusher message
 * that ends the wait can be missed - a dropped socket, a tab that was asleep.
 * Polling on its own is not enough, though: a run that dies without reaching
 * its `onFailure` handler (a crashed worker, an event that was never picked up)
 * leaves the row exactly as an in-progress run does, and an uncapped poll then
 * spins forever on a screen with no exit. The cap turns that into a visible
 * timeout with a retry button.
 *
 * Kept free of imports so client components can use it without cost.
 */

/** Gap between polls while an analysis is running. */
export const ANALYSIS_POLL_INTERVAL_MS = 4000;

/**
 * How long a run may stay unfinished before the UI stops waiting on it.
 *
 * Generous next to the 20-45 seconds the pages advertise, because Inngest
 * retries a failing step three times with backoff and a throttled run can sit
 * queued behind another of the user's analyses before it even starts.
 */
export const ANALYSIS_POLL_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Reports whether a run that started at `startedAt` has been waiting too long.
 *
 * @param startedAt - When the run was queued; anything unparseable disables the
 *   timeout, so a missing timestamp degrades to the previous behaviour rather
 *   than to an instant, wrong "timed out" screen.
 * @param now - Current time, injectable for tests.
 */
export const hasAnalysisTimedOut = (
  startedAt: Date | string | number | null | undefined,
  now: number = Date.now(),
) => {
  if (startedAt === null || startedAt === undefined) return false;

  const started =
    startedAt instanceof Date
      ? startedAt.getTime()
      : new Date(startedAt).getTime();

  if (!Number.isFinite(started)) return false;

  return now - started > ANALYSIS_POLL_TIMEOUT_MS;
};
