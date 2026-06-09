-- CreateEnum
CREATE TYPE "CarerLinkStatus" AS ENUM ('PENDING', 'ACTIVE');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "createdByCarerId" TEXT;

-- CreateTable
CREATE TABLE "CarerLink" (
    "id" TEXT NOT NULL,
    "carerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "CarerLinkStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarerLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarerLink_carerId_idx" ON "CarerLink"("carerId");

-- CreateIndex
CREATE INDEX "CarerLink_clientId_idx" ON "CarerLink"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "CarerLink_carerId_clientId_key" ON "CarerLink"("carerId", "clientId");

-- CreateIndex
CREATE INDEX "Booking_createdByCarerId_idx" ON "Booking"("createdByCarerId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_createdByCarerId_fkey"
    FOREIGN KEY ("createdByCarerId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarerLink" ADD CONSTRAINT "CarerLink_carerId_fkey"
    FOREIGN KEY ("carerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarerLink" ADD CONSTRAINT "CarerLink_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
