-- Progress the customer can see, without pretending to do continuous GPS.
--
-- Kept out of BookingStatus on purpose: that enum gates payment, payout and
-- permission logic, and a progress label must not be able to affect any of it.
--
-- Location is a single point the runner explicitly shares, not a stream, and is
-- cleared on completion so movement history isn't retained.

CREATE TYPE "JourneyStage" AS ENUM ('NOT_STARTED', 'ON_THE_WAY_TO_SHOP', 'AT_SHOP', 'HEADING_TO_YOU', 'ARRIVED');

ALTER TABLE "Booking" ADD COLUMN "journeyStage" "JourneyStage" NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "Booking" ADD COLUMN "journeyUpdatedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "lastLat" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN "lastLng" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN "lastLocationAt" TIMESTAMP(3);
