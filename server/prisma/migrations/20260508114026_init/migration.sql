/*
  Warnings:

  - The values [PAUSED] on the enum `RunnerStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RunnerStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED');
ALTER TABLE "RunnerProfile" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "RunnerProfile" ALTER COLUMN "status" TYPE "RunnerStatus_new" USING ("status"::text::"RunnerStatus_new");
ALTER TYPE "RunnerStatus" RENAME TO "RunnerStatus_old";
ALTER TYPE "RunnerStatus_new" RENAME TO "RunnerStatus";
DROP TYPE "RunnerStatus_old";
ALTER TABLE "RunnerProfile" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "RunnerProfile" ALTER COLUMN "status" SET DEFAULT 'PENDING';
