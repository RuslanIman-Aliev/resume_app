-- AlterTable
ALTER TABLE "tracker_position" ADD COLUMN     "matchScore" INTEGER,
ALTER COLUMN "location" DROP NOT NULL;
