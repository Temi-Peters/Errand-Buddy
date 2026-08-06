-- Lifecycle stamps so fulfilment speed can be measured. updatedAt only records
-- the most recent change, so time-to-assignment and time-to-completion were
-- previously unknowable. Existing rows stay null — these only fill going forward.

ALTER TABLE "Booking" ADD COLUMN "assignedAt"  TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "startedAt"   TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- Reporting reads these by created date across the whole table.
CREATE INDEX "Booking_createdAt_idx" ON "Booking"("createdAt");
