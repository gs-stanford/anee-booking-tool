ALTER TABLE "Instrument" ADD COLUMN "impactCategory" TEXT NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "Instrument" ADD COLUMN "crossShared" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Instrument" SET "impactCategory" = 'LASER' WHERE lower("name") LIKE '%laser%';
UPDATE "Instrument" SET "impactCategory" = 'CNT_REACTOR' WHERE (lower("name") LIKE '%cnt%' OR lower("name") LIKE '%nanotube%') AND lower("name") LIKE '%reactor%';
UPDATE "Instrument" SET "impactCategory" = 'FUMEHOOD' WHERE lower("name") LIKE '%fume%hood%';
CREATE TABLE "SafetySignup" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "date" TEXT NOT NULL,
  "time" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SafetySignup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SafetySignup_date_time_key" ON "SafetySignup"("date", "time");
CREATE INDEX "SafetySignup_userId_idx" ON "SafetySignup"("userId");
