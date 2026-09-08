-- Global system categories + typed categories.
-- Makes Category global (userId null = system), adds a required TransactionType,
-- backfills the 19 canonical system categories and remaps all legacy per-user
-- default categories to them, then removes the legacy defaults.
--
-- Uniqueness: enforced with PostgreSQL PARTIAL unique indexes (Prisma cannot
-- represent partial unique constraints). They intentionally have no matching
-- declaration in schema.prisma; treat them as a schema extension owned by this
-- migration. Do not attempt to recreate them via `prisma migrate dev`.

-- 1) Schema changes (first make type nullable so existing rows can be detached)
ALTER TABLE "Category" ADD COLUMN "type" "TransactionType";
ALTER TABLE "Category" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Category" ALTER COLUMN "userId" DROP NOT NULL;
DROP INDEX "Category_userId_name_key";

-- 2) Canonical system categories (deterministic ids 1..19, stable across envs).
-- Income (8) + Expense (11) = 19 total; "Other" exists once per type.
INSERT INTO "Category" ("id", "userId", "type", "name", "icon", "color", "isSystem", "createdAt") VALUES
  (1,  NULL, 'INCOME', 'Salary',         '💰', '#22c55e', true, now()),
  (2,  NULL, 'INCOME', 'Allowance',      '🪙', '#a3e635', true, now()),
  (3,  NULL, 'INCOME', 'Bonus',          '🎁', '#facc15', true, now()),
  (4,  NULL, 'INCOME', 'Dividends',      '📈', '#10b981', true, now()),
  (5,  NULL, 'INCOME', 'Investments',    '📊', '#0ea5e9', true, now()),
  (6,  NULL, 'INCOME', 'Lottery',        '🎰', '#f97316', true, now()),
  (7,  NULL, 'INCOME', 'Tips',           '💵', '#14b8a6', true, now()),
  (8,  NULL, 'INCOME', 'Other',          '📦', '#6b7280', true, now()),
  (9,  NULL, 'EXPENSE', 'Bills',         '🧾', '#ef4444', true, now()),
  (10, NULL, 'EXPENSE', 'Food',          '🍜', '#f59e0b', true, now()),
  (11, NULL, 'EXPENSE', 'Shopping',      '🛍️', '#ec4899', true, now()),
  (12, NULL, 'EXPENSE', 'Entertainment', '🎬', '#8b5cf6', true, now()),
  (13, NULL, 'EXPENSE', 'Transportation', '🚗', '#3b82f6', true, now()),
  (14, NULL, 'EXPENSE', 'Clothing',      '👕', '#e879f9', true, now()),
  (15, NULL, 'EXPENSE', 'Education',     '📚', '#06b6d4', true, now()),
  (16, NULL, 'EXPENSE', 'Fitness',       '🏋️', '#22d3ee', true, now()),
  (17, NULL, 'EXPENSE', 'Health',        '🏥', '#10b981', true, now()),
  (18, NULL, 'EXPENSE', 'Pets',          '🐾', '#a16207', true, now()),
  (19, NULL, 'EXPENSE', 'Other',         '📦', '#6b7280', true, now());

-- 3) Remap legacy per-user default categories to the matching system category.
-- Simple name matches (Food, Shopping, Entertainment, Bills, Health, Education,
-- Salary) plus legacy "Transport" -> system "Transportation". Legacy "Freelance"
-- has no system target and no references; it is simply dropped in step 4.
WITH map AS (
  SELECT l."id" AS legacy_id, s."id" AS system_id
  FROM "Category" l
  JOIN "Category" s ON s."isSystem" = true AND l."userId" IS NOT NULL
    AND s."name" = CASE l."name" WHEN 'Transport' THEN 'Transportation' ELSE l."name" END
  WHERE l."name" <> 'Other'
)
UPDATE "Transaction" t SET "categoryId" = map."system_id"
FROM map WHERE t."categoryId" = map."legacy_id";

WITH map AS (
  SELECT l."id" AS legacy_id, s."id" AS system_id
  FROM "Category" l
  JOIN "Category" s ON s."isSystem" = true AND l."userId" IS NOT NULL
    AND s."name" = CASE l."name" WHEN 'Transport' THEN 'Transportation' ELSE l."name" END
  WHERE l."name" <> 'Other'
)
UPDATE "Budget" b SET "categoryId" = map."system_id"
FROM map WHERE b."categoryId" = map."legacy_id";

WITH map AS (
  SELECT l."id" AS legacy_id, s."id" AS system_id
  FROM "Category" l
  JOIN "Category" s ON s."isSystem" = true AND l."userId" IS NOT NULL
    AND s."name" = CASE l."name" WHEN 'Transport' THEN 'Transportation' ELSE l."name" END
  WHERE l."name" <> 'Other'
)
UPDATE "RecurringTransaction" rt SET "categoryId" = map."system_id"
FROM map WHERE rt."categoryId" = map."legacy_id";

WITH map AS (
  SELECT l."id" AS legacy_id, s."id" AS system_id
  FROM "Category" l
  JOIN "Category" s ON s."isSystem" = true AND l."userId" IS NOT NULL
    AND s."name" = CASE l."name" WHEN 'Transport' THEN 'Transportation' ELSE l."name" END
  WHERE l."name" <> 'Other'
)
UPDATE "RecurringBudget" rb SET "categoryId" = map."system_id"
FROM map WHERE rb."categoryId" = map."legacy_id";

WITH map AS (
  SELECT l."id" AS legacy_id, s."id" AS system_id
  FROM "Category" l
  JOIN "Category" s ON s."isSystem" = true AND l."userId" IS NOT NULL
    AND s."name" = CASE l."name" WHEN 'Transport' THEN 'Transportation' ELSE l."name" END
  WHERE l."name" <> 'Other'
)
UPDATE "Goal" g SET "categoryId" = map."system_id"
FROM map WHERE g."categoryId" = map."legacy_id";

-- 4) Legacy "Other": remap strictly by the referencing row's own type so income
-- transactions point at system "Other" (INCOME, id 8) and everything else at
-- system "Other" (EXPENSE, id 19). No legacy "Other" budget/goal/recurring
-- references exist in production; the fixed EXPENSE mapping is the safe default.
UPDATE "Transaction" t SET "categoryId" = (
  SELECT c."id" FROM "Category" c
  WHERE c."isSystem" = true AND c."name" = 'Other' AND c."type" = t."type"
)
WHERE t."categoryId" IN (SELECT "id" FROM "Category" WHERE "userId" IS NOT NULL AND "name" = 'Other');

UPDATE "RecurringTransaction" rt SET "categoryId" = (
  SELECT c."id" FROM "Category" c
  WHERE c."isSystem" = true AND c."name" = 'Other' AND c."type" = rt."type"
)
WHERE rt."categoryId" IN (SELECT "id" FROM "Category" WHERE "userId" IS NOT NULL AND "name" = 'Other');

UPDATE "Budget" b SET "categoryId" = (
  SELECT c."id" FROM "Category" c
  WHERE c."isSystem" = true AND c."name" = 'Other' AND c."type" = 'EXPENSE'
)
WHERE b."categoryId" IN (SELECT "id" FROM "Category" WHERE "userId" IS NOT NULL AND "name" = 'Other');

UPDATE "RecurringBudget" rb SET "categoryId" = (
  SELECT c."id" FROM "Category" c
  WHERE c."isSystem" = true AND c."name" = 'Other' AND c."type" = 'EXPENSE'
)
WHERE rb."categoryId" IN (SELECT "id" FROM "Category" WHERE "userId" IS NOT NULL AND "name" = 'Other');

UPDATE "Goal" g SET "categoryId" = (
  SELECT c."id" FROM "Category" c
  WHERE c."isSystem" = true AND c."name" = 'Other' AND c."type" = 'EXPENSE'
)
WHERE g."categoryId" IN (SELECT "id" FROM "Category" WHERE "userId" IS NOT NULL AND "name" = 'Other');

-- 5) Drop every legacy per-user default category. All references were remapped
-- above (Freelance had none), so these rows are now orphaned and safe to delete.
DELETE FROM "Category"
WHERE "userId" IS NOT NULL
  AND "name" IN ('Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Salary', 'Freelance', 'Other');

-- 6) Now every remaining category is typed.
ALTER TABLE "Category" ALTER COLUMN "type" SET NOT NULL;

-- 7) Partial unique constraints + helper indexes (PostgreSQL dialect).
CREATE UNIQUE INDEX "Category_system_name_type_key"
  ON "Category" ("name", "type") WHERE "isSystem" = true;

CREATE UNIQUE INDEX "Category_userId_name_type_key"
  ON "Category" ("userId", "name", "type") WHERE "userId" IS NOT NULL;

CREATE INDEX "Category_userId_idx" ON "Category" ("userId");
CREATE INDEX "Category_type_idx" ON "Category" ("type");