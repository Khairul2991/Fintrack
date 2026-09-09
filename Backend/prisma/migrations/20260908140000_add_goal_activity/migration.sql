-- CreateEnum
CREATE TYPE "GoalActivityType" AS ENUM ('CONTRIBUTION', 'WITHDRAWAL');

-- CreateTable
CREATE TABLE "GoalActivity" (
    "id" SERIAL NOT NULL,
    "goalId" INTEGER NOT NULL,
    "accountId" INTEGER,
    "amount" DECIMAL(18,4) NOT NULL,
    "type" "GoalActivityType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoalActivity_goalId_idx" ON "GoalActivity"("goalId");

CREATE INDEX "GoalActivity_accountId_idx" ON "GoalActivity"("accountId");

CREATE INDEX "GoalActivity_type_idx" ON "GoalActivity"("type");

CREATE INDEX "GoalActivity_date_idx" ON "GoalActivity"("date");

-- AddForeignKey
ALTER TABLE "GoalActivity" ADD CONSTRAINT "GoalActivity_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GoalActivity" ADD CONSTRAINT "GoalActivity_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve existing goal progress as traceable activity history.
-- For every existing goal with a stored currentAmount > 0, insert a
-- deterministic CONTRIBUTION equal to its stored value. This keeps the
-- derived currentAmount identical to the previous stored value (no data loss)
-- without guessing an account for goals that have none.
INSERT INTO "GoalActivity" ("goalId", "accountId", "amount", "type", "date", "note", "createdAt", "updatedAt")
SELECT g."id", g."accountId", g."currentAmount", 'CONTRIBUTION', g."createdAt", 'Initial amount', g."createdAt", g."createdAt"
FROM "Goal" g
WHERE g."currentAmount" > 0;