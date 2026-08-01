-- Records how much was taken off the standard tariff for a booking, so a
-- promotional price can be told apart from a cheaper booking in reporting.
ALTER TABLE "Booking" ADD COLUMN "discountAmount" DECIMAL(10,2);
