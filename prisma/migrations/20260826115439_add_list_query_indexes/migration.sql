-- CreateIndex
CREATE INDEX "ResumeAnalysis_resumeId_createdAt_idx" ON "ResumeAnalysis"("resumeId", "createdAt");

-- CreateIndex
CREATE INDEX "job_application_userId_createdAt_idx" ON "job_application"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "resume_userId_createdAt_idx" ON "resume"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "tracker_position_userId_createdAt_idx" ON "tracker_position"("userId", "createdAt");
