-- The previous full unique index prevented reusing the name of an
-- archived (soft-deleted) account. Uniqueness now applies only to
-- active accounts so that an archived account's name can be reused
-- while keeping active account names unique per user.

DROP INDEX "Account_userId_name_key";

CREATE UNIQUE INDEX "Account_userId_name_active_key"
  ON "Account" ("userId", "name")
  WHERE "deletedAt" IS NULL;