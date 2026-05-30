CREATE TABLE "BookingTemplate" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "bookingType" "BookingType" NOT NULL,
    "subscription" TEXT,
    "time" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "postcodeArea" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookingTemplate_customerId_idx" ON "BookingTemplate"("customerId");

ALTER TABLE "BookingTemplate" ADD CONSTRAINT "BookingTemplate_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
