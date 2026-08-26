-- Replaces the free-text `status` columns on `resume` and `job_application`
-- with real enum types.
--
-- Both columns had accumulated more than one spelling of the same state:
-- `resume.status` defaulted to 'draft' but the analysis job wrote 'ANALYZED',
-- and `job_application.status` defaulted to 'Draft' while the code wrote
-- 'TO_APPLY' and then 'ANALYZED'. Reads that matched on the exact string
-- (`getJobMatchResult`) therefore depended on every writer agreeing by
-- convention alone.
--
-- Existing rows are normalised case-insensitively before the type change, so
-- no row is dropped and no analysis becomes unreachable. Anything that is not
-- recognisably an analysed or to-apply row folds into DRAFT, which matches the
-- column defaults these rows were created with.

CREATE TYPE "ResumeStatus" AS ENUM ('DRAFT', 'ANALYZED');
CREATE TYPE "JobApplicationStatus" AS ENUM ('DRAFT', 'TO_APPLY', 'ANALYZED');

-- resume ---------------------------------------------------------------

UPDATE "resume" SET "status" = 'ANALYZED' WHERE upper("status") = 'ANALYZED';
UPDATE "resume" SET "status" = 'DRAFT' WHERE upper("status") <> 'ANALYZED';

ALTER TABLE "resume" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "resume"
  ALTER COLUMN "status" TYPE "ResumeStatus" USING "status"::"ResumeStatus";
ALTER TABLE "resume" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- job_application ------------------------------------------------------

UPDATE "job_application" SET "status" = 'ANALYZED' WHERE upper("status") = 'ANALYZED';
UPDATE "job_application" SET "status" = 'TO_APPLY' WHERE upper("status") = 'TO_APPLY';
UPDATE "job_application" SET "status" = 'DRAFT'
  WHERE upper("status") NOT IN ('ANALYZED', 'TO_APPLY');

ALTER TABLE "job_application" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "job_application"
  ALTER COLUMN "status" TYPE "JobApplicationStatus" USING "status"::"JobApplicationStatus";
ALTER TABLE "job_application" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
