-- Gives a kanban card a link back to the analysis that produced it, and adds
-- the two user lookups Better Auth performs on every request path.
--
-- Why the link: `analyze-job-matched` created a `tracker_position` row on every
-- run. Inngest retries a step whose commit failed, and a user can re-run the
-- same analysis, so one job posting could end up as several identical cards
-- that the user had to delete by hand. With a unique `jobApplicationId` the
-- step upserts instead of inserting, which makes it idempotent.
--
-- Why SET NULL: deleting an analysis must not delete the tracked position. The
-- card is the user's board state - by then it may have moved through several
-- stages - so it survives with the link cleared. Existing cards keep NULL:
-- they predate the link and cannot be matched back to an analysis by anything
-- better than company + title, which is a guess.

ALTER TABLE "tracker_position" ADD COLUMN IF NOT EXISTS "jobApplicationId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "tracker_position_jobApplicationId_key"
  ON "tracker_position"("jobApplicationId");

ALTER TABLE "tracker_position"
  DROP CONSTRAINT IF EXISTS "tracker_position_jobApplicationId_fkey";

ALTER TABLE "tracker_position"
  ADD CONSTRAINT "tracker_position_jobApplicationId_fkey"
  FOREIGN KEY ("jobApplicationId") REFERENCES "job_application"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Better Auth reads both tables by `userId`: session revocation and cascade
-- deletes on one, `listAccounts` (every visit to /dashboard/settings) and
-- account linking on the other. Both were sequential scans.
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session"("userId");
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account"("userId");
