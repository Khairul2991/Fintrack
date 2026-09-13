-- Soft-delete (tombstone) flag for accounts that already have financial
-- history. Unused accounts are hard-deleted instead; used accounts keep
-- this marker so history keeps its account identity while the account
-- disappears from active lists and selectors. Additive: no data rewrite.

-- AlterTable
ALTER TABLE "Account" ADD COLUMN "deletedAt" TIMESTAMP(3);