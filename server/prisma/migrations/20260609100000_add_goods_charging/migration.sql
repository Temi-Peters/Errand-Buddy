-- AlterTable: cost of goods charged to the payer at task completion
ALTER TABLE "Booking" ADD COLUMN "goodsCost" DECIMAL(10,2);
ALTER TABLE "Booking" ADD COLUMN "goodsChargedAt" TIMESTAMP(3);

-- AlterTable: track the runner's goods reimbursement transfer
ALTER TABLE "Payment" ADD COLUMN "goodsReimbursementAmount" DECIMAL(10,2);
ALTER TABLE "Payment" ADD COLUMN "goodsTransferId" TEXT;
