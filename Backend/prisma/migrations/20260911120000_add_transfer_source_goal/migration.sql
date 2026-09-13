-- Add optional Transaction.sourceGoalId -> Goal (SET NULL) so a transfer can
-- also reduce the source account's goal allocation (WITHDRAWAL GoalActivity),
-- independent of the destination goal (Transaction.goalId -> CONTRIBUTION).
-- Removing the unique constraint on GoalActivity.transactionId lets a single
-- transfer carry both a source withdrawal and a destination contribution.

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "sourceGoalId" INTEGER;

-- CreateIndex
CREATE INDEX "Transaction_sourceGoalId_idx" ON "Transaction"("sourceGoalId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_sourceGoalId_fkey" FOREIGN KEY ("sourceGoalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropIndex
DROP INDEX "GoalActivity_transactionId_key";

-- CreateIndex
CREATE INDEX "GoalActivity_transactionId_idx" ON "GoalActivity"("transactionId");