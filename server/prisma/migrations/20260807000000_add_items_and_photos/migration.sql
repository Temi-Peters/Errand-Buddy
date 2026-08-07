-- Structured shopping list + photo evidence.
--
-- Items turn "they didn't have it" from a phone call into a recorded outcome,
-- and let a customer name a backup in advance. Photos let the customer show
-- which product they mean and the runner prove what was actually spent — the
-- goods charge previously had no evidence trail at all.
--
-- Both are additive: a booking with neither behaves exactly as before.

CREATE TYPE "ItemStatus" AS ENUM ('PENDING', 'BOUGHT', 'SUBSTITUTED', 'UNAVAILABLE');
CREATE TYPE "PhotoKind" AS ENUM ('REQUEST', 'RECEIPT');

CREATE TABLE "BookingItem" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "quantity" TEXT NOT NULL DEFAULT '',
    "backupName" TEXT,
    "status" "ItemStatus" NOT NULL DEFAULT 'PENDING',
    "substitutedWith" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookingPhoto" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kind" "PhotoKind" NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "caption" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingPhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookingItem_bookingId_idx" ON "BookingItem"("bookingId");
CREATE INDEX "BookingPhoto_bookingId_idx" ON "BookingPhoto"("bookingId");
CREATE INDEX "BookingPhoto_bookingId_kind_idx" ON "BookingPhoto"("bookingId", "kind");

ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingPhoto" ADD CONSTRAINT "BookingPhoto_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
