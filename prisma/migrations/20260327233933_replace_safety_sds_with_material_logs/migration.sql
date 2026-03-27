/*
  Warnings:

  - You are about to drop the `SafetySdsEntry` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SafetySdsEntry";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "SafetyMaterialLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flow" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "initialAmount" TEXT NOT NULL,
    "loggedAt" DATETIME NOT NULL,
    "loggedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SafetyMaterialLog_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SafetyMaterialLog_flow_loggedAt_idx" ON "SafetyMaterialLog"("flow", "loggedAt");

-- CreateIndex
CREATE INDEX "SafetyMaterialLog_title_idx" ON "SafetyMaterialLog"("title");

-- CreateIndex
CREATE INDEX "SafetyMaterialLog_category_idx" ON "SafetyMaterialLog"("category");
