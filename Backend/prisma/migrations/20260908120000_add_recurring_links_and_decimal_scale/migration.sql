-- Normalize financial Decimal columns from DECIMAL(65,30) to DECIMAL(18,4).
-- PostgreSQL rounds values with more than 4 fractional digits to 4 digits.
ALTER TABLE "Transaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,4);

ALTER TABLE "Budget" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,4);

ALTER TABLE "Account" ALTER COLUMN "initialBalance" SET DATA TYPE DECIMAL(18,4);

ALTER TABLE "RecurringTransaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,4);

ALTER TABLE "RecurringBudget" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,4);

ALTER TABLE "Goal" ALTER COLUMN "targetAmount" SET DATA TYPE DECIMAL(18,4);

ALTER TABLE "Goal" ALTER COLUMN "currentAmount" SET DATA TYPE DECIMAL(18,4);

-- Add nullable parent links: Budget -> RecurringBudget
ALTER TABLE "Budget" ADD COLUMN "recurringBudgetId" INTEGER;

-- Add nullable parent links: Transaction -> RecurringTransaction
ALTER TABLE "Transaction" ADD COLUMN "recurringTransactionId" INTEGER;

-- CreateIndex
CREATE INDEX "Budget_recurringBudgetId_idx" ON "Budget"("recurringBudgetId");

CREATE INDEX "Transaction_recurringTransactionId_idx" ON "Transaction"("recurringTransactionId");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_recurringBudgetId_fkey" FOREIGN KEY ("recurringBudgetId") REFERENCES "RecurringBudget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recurringTransactionId_fkey" FOREIGN KEY ("recurringTransactionId") REFERENCES "RecurringTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;