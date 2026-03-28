/*
  Warnings:

  - You are about to drop the column `analysisResult` on the `resume` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "resume" DROP COLUMN "analysisResult";

-- CreateTable
CREATE TABLE "ResumeAnalysis" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "contentQuality" INTEGER NOT NULL,
    "atsOptimization" INTEGER NOT NULL,
    "experience" INTEGER NOT NULL,
    "skillsMatch" INTEGER NOT NULL,
    "strengths" JSONB NOT NULL,
    "quickWins" JSONB NOT NULL,
    "improvements" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResumeAnalysis_resumeId_key" ON "ResumeAnalysis"("resumeId");

-- AddForeignKey
ALTER TABLE "ResumeAnalysis" ADD CONSTRAINT "ResumeAnalysis_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
