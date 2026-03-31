-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Instrument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "statusNote" TEXT,
    "ownerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Instrument_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Instrument" ("createdAt", "description", "id", "location", "name", "status", "updatedAt")
SELECT
    "createdAt",
    "description",
    "id",
    "location",
    "name",
    CASE
        WHEN "status" = 'AVAILABLE' THEN 'AVAILABLE'
        ELSE 'UNAVAILABLE'
    END,
    "updatedAt"
FROM "Instrument";
DROP TABLE "Instrument";
ALTER TABLE "new_Instrument" RENAME TO "Instrument";
CREATE UNIQUE INDEX "Instrument_name_key" ON "Instrument"("name");
CREATE INDEX "Instrument_ownerId_idx" ON "Instrument"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
