-- Add optional Transaction.goalId -> Goal (SET NULL) so deleting a Goal
-- never deletes Transactions, and Transaction.goalId -> linked GoalActivity
-- (CASCADE) so deleting a Transaction removes its Goal history automatically.

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "goalId" INTEGER;

-- CreateIndex
CREATE INDEX "Transaction_goalId_idx" ON "Transaction"("goalId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "GoalActivity" ADD COLUMN "transactionId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "GoalActivity_transactionId_key" ON "GoalActivity"("transactionId");

-- AddForeignKey
ALTER TABLE "GoalActivity" ADD CONSTRAINT "GoalActivity_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;