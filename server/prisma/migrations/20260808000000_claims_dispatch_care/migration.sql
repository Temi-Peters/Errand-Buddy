-- Claims become a conversation; jobs widen past their area; customers keep
-- standing notes; cancellations and reschedules are recorded.

-- A claim can trigger a real refund, so the runner it names must be able to see
-- and answer it.
ALTER TABLE "Claim" ADD COLUMN "runnerId" TEXT;
ALTER TABLE "Claim" ADD COLUMN "runnerRepliedAt" TIMESTAMP(3);
CREATE INDEX "Claim_runnerId_idx" ON "Claim"("runnerId");
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_runnerId_fkey"
    FOREIGN KEY ("runnerId") REFERENCES "RunnerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ClaimMessage" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClaimMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClaimMessage_claimId_idx" ON "ClaimMessage"("claimId");
ALTER TABLE "ClaimMessage" ADD CONSTRAINT "ClaimMessage_claimId_fkey"
    FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClaimMessage" ADD CONSTRAINT "ClaimMessage_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill the runner from the booking so existing claims aren't orphaned.
UPDATE "Claim" c SET "runnerId" = b."runnerId" FROM "Booking" b WHERE b."id" = c."bookingId";

-- Dispatch + lifecycle
ALTER TABLE "Booking" ADD COLUMN "openedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "cancellationReason" TEXT;
ALTER TABLE "Booking" ADD COLUMN "rescheduledAt" TIMESTAMP(3);

-- Existing live jobs are treated as opened when they were created, so the
-- widening rule has a sensible starting point rather than never applying.
UPDATE "Booking" SET "openedAt" = "createdAt" WHERE "status" = 'PENDING' AND "openedAt" IS NULL;

-- Standing notes that apply to every booking
ALTER TABLE "CustomerProfile" ADD COLUMN "standingNotes" TEXT;
