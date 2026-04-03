/*
  Warnings:

  - The `missingSkills` column on the `job_application` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `job_application` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `resumeId` to the `job_application` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "job_application" ADD COLUMN     "matchingSkills" JSONB,
ADD COLUMN     "resumeId" TEXT NOT NULL,
ADD COLUMN     "tailoringTips" JSONB,
ADD COLUMN     "url" TEXT,
ALTER COLUMN "companyName" DROP NOT NULL,
ALTER COLUMN "jobTitle" DROP NOT NULL,
DROP COLUMN "missingSkills",
ADD COLUMN     "missingSkills" JSONB,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Draft';

-- AddForeignKey
ALTER TABLE "job_application" ADD CONSTRAINT "job_application_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
