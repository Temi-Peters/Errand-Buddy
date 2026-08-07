-- Out-of-stock handling and spend protection.
--
-- goodsBudget is what the customer agreed to spend on the shopping itself. The
-- runner previously typed any figure up to £1000 into an unvalidated box and the
-- customer was charged it. Anything above the budget is now held as an overage
-- for the customer to approve rather than taken silently.

CREATE TYPE "SubstitutionPreference" AS ENUM ('ASK_ME_FIRST', 'SUBSTITUTE_FREELY', 'NO_SUBSTITUTES');

ALTER TABLE "Booking" ADD COLUMN "goodsBudget" DECIMAL(10,2);
ALTER TABLE "Booking" ADD COLUMN "substitutionPreference" "SubstitutionPreference" NOT NULL DEFAULT 'ASK_ME_FIRST';
ALTER TABLE "Booking" ADD COLUMN "overageReason" TEXT;
