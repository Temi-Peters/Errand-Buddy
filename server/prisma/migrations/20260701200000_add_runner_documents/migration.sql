-- AlterTable
ALTER TABLE "RunnerProfile" ADD COLUMN "idVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RunnerDocument" (
    "id" TEXT NOT NULL,
    "runnerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunnerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RunnerDocument_runnerId_idx" ON "RunnerDocument"("runnerId");

-- AddForeignKey
ALTER TABLE "RunnerDocument" ADD CONSTRAINT "RunnerDocument_runnerId_fkey"
    FOREIGN KEY ("runnerId") REFERENCES "RunnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
