-- Adds a terminal failure state to both analysis lifecycles.
--
-- Until now a run that died - most reliably on a model response that did not
-- match the Zod schema - left `resume.status` on DRAFT and
-- `job_application.status` on TO_APPLY: the exact values a run still in
-- progress holds. The client polls those rows every four seconds, so a failed
-- analysis was indistinguishable from a slow one and the "Analyzing..." screen
-- never resolved. The Inngest `onFailure` handlers now write FAILED here.
--
-- Only new labels are added; no existing row changes value, and the column
-- defaults stay as they are. PostgreSQL 12+ allows ADD VALUE inside the
-- transaction Prisma wraps this migration in as long as the new label is not
-- also used by this migration, which it is not.

ALTER TYPE "ResumeStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "JobApplicationStatus" ADD VALUE IF NOT EXISTS 'FAILED';
