-- AlterTable
ALTER TABLE "Room" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + interval '1 hour';
