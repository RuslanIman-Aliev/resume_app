-- AlterTable
ALTER TABLE "job_application"
DROP COLUMN IF EXISTS "missingInfoFromPhoto",
ADD COLUMN "requirementsMatch" JSONB,
ADD COLUMN "skillsGap" JSONB,
ADD COLUMN "keywordsGap" JSONB,
ADD COLUMN "summary" JSONB;
