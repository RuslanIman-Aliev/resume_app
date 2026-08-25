-- AlterTable
ALTER TABLE "account" ADD COLUMN     "accessTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "refreshTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "scope" TEXT;

-- AlterTable
-- `updatedAt` is app-level (@updatedAt) so Prisma emits it without a default,
-- which would fail on a non-empty table. Backfill existing rows with a
-- temporary default, then drop it so the column matches the Prisma schema.
ALTER TABLE "verification" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "verification" ALTER COLUMN "updatedAt" DROP DEFAULT;
