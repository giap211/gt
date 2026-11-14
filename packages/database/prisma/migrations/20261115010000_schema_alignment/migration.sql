-- Align the live schema with Prisma without resetting existing tables.
-- IF NOT EXISTS also supports databases previously synchronized with prisma db push.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "username" TEXT;

UPDATE "User"
SET "username" = 'user_' || SUBSTRING(MD5("id"), 1, 12)
WHERE "username" IS NULL OR BTRIM("username") = '';

ALTER TABLE "User"
  ALTER COLUMN "username" SET NOT NULL,
  ADD COLUMN IF NOT EXISTS "legacyHistoryMigratedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

ALTER TABLE "WatchHistory"
  ADD COLUMN IF NOT EXISTS "episodeSlug" TEXT,
  ADD COLUMN IF NOT EXISTS "totalDurationSeconds" INTEGER NOT NULL DEFAULT 0;

-- The unique index on Movie.slug already supports slug lookups.
DROP INDEX IF EXISTS "Movie_slug_idx";
