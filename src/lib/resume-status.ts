/**
 * The `resume.status` vocabulary, kept free of imports on purpose.
 *
 * It lives outside `@/lib/types` because that module pulls in zod and the
 * analysis schemas; importing a status helper from there added ~285KB of zod
 * and schema code to the resumes page's client bundle. Nothing here needs a
 * dependency, so nothing here has one.
 */

/**
 * The two states `resume.status` can hold, mirroring the `ResumeStatus` enum in
 * `prisma/schema.prisma`.
 *
 * Declared here rather than imported from `@prisma/client` so client components
 * can read the list without pulling the Prisma runtime into the browser bundle -
 * keep the two in step when adding a state.
 */
export const resumeStatusValues = ["DRAFT", "ANALYZED"] as const;

export type ResumeStatusValue = (typeof resumeStatusValues)[number];

/**
 * Normalises a `?status=` URL parameter into a resume list filter.
 *
 * Returns `undefined` for anything unrecognised, so a stale or hand-edited link
 * degrades to "all resumes" rather than failing `getAll`'s input validation.
 * The comparison is case-insensitive because links shared before the enum
 * migration carry the old lowercase `draft` spelling.
 */
export const parseResumeStatusFilter = (
  value: string | undefined,
): ResumeStatusValue | undefined => {
  const normalized = value?.toUpperCase();
  return resumeStatusValues.find((status) => status === normalized);
};
