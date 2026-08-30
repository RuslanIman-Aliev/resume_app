/**
 * Channel names for analysis notifications, shared by the client hooks, the
 * Inngest jobs that publish, and the endpoint that authorizes subscriptions.
 *
 * Both channels used to be public (`resume-updates` and `job-match`) with the
 * resource id in the event name. A Pusher key is by definition present in the
 * client bundle, so anyone holding it could subscribe and watch every user's
 * `resumeId`, `applicationId` and the moment each analysis finished. The
 * `private-` prefix is what makes Pusher demand authorization, and one channel
 * per resource means an authorized subscriber only ever receives events about
 * the row they were authorized for.
 */

const RESUME_PREFIX = "private-resume-";
const JOB_MATCH_PREFIX = "private-job-match-";

/** Channel carrying the outcome of one resume analysis. */
export const resumeAnalysisChannel = (resumeId: string) =>
  `${RESUME_PREFIX}${resumeId}`;

/** Channel carrying the outcome of one job-match analysis. */
export const jobMatchChannel = (applicationId: string) =>
  `${JOB_MATCH_PREFIX}${applicationId}`;

/** Event name for a run that produced a result. */
export const analyzedEventName = (id: string) => `analyzed-${id}`;

/** Event name for a run that ended without one. */
export const failedEventName = (id: string) => `analysis-failed-${id}`;

export type AnalysisChannel =
  | { kind: "resume"; resumeId: string }
  | { kind: "jobMatch"; applicationId: string };

/**
 * Reads a channel name back into the resource whose ownership has to be
 * checked before a subscription is authorized.
 * @param channel - The `channel_name` Pusher sends to the auth endpoint
 * @returns The resource, or null for any channel this app does not publish on
 */
export const parseAnalysisChannel = (
  channel: string,
): AnalysisChannel | null => {
  if (channel.startsWith(RESUME_PREFIX)) {
    const resumeId = channel.slice(RESUME_PREFIX.length);
    return resumeId ? { kind: "resume", resumeId } : null;
  }

  if (channel.startsWith(JOB_MATCH_PREFIX)) {
    const applicationId = channel.slice(JOB_MATCH_PREFIX.length);
    return applicationId ? { kind: "jobMatch", applicationId } : null;
  }

  return null;
};
