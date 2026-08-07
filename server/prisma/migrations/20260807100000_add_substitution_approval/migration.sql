-- In-shop substitution approval: the runner photographs the alternative and the
-- customer taps yes or no while they're still standing there.
--
-- proposedSubstitute is kept separate from substitutedWith so a declined offer
-- never reads as something that was actually bought.

ALTER TYPE "ItemStatus" ADD VALUE 'AWAITING_APPROVAL' AFTER 'BOUGHT';
ALTER TYPE "PhotoKind" ADD VALUE 'SUBSTITUTE';

ALTER TABLE "BookingItem" ADD COLUMN "proposedSubstitute" TEXT;
ALTER TABLE "BookingItem" ADD COLUMN "proposedAt" TIMESTAMP(3);
ALTER TABLE "BookingPhoto" ADD COLUMN "itemId" TEXT;

CREATE INDEX "BookingPhoto_itemId_idx" ON "BookingPhoto"("itemId");
