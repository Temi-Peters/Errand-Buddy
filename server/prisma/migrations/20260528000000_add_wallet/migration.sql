-- Add ON_HOLD to BookingStatus enum
ALTER TYPE "BookingStatus" ADD VALUE 'ON_HOLD';

-- Create WalletTransactionType enum
CREATE TYPE "WalletTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'CHARGE', 'OVERAGE', 'REIMBURSEMENT');

-- Add walletBalance to CustomerProfile
ALTER TABLE "CustomerProfile" ADD COLUMN "walletBalance" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Add overage/on-hold fields to Booking
ALTER TABLE "Booking" ADD COLUMN "overageCoveredAmount" DECIMAL(10,2);
ALTER TABLE "Booking" ADD COLUMN "overageCoveredAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "onHoldUntil" TIMESTAMP(3);

-- Create WalletTransaction table
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "stripePaymentIntentId" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- Add index and foreign key
CREATE INDEX "WalletTransaction_customerId_idx" ON "WalletTransaction"("customerId");

ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
