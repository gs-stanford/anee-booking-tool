-- CreateTable
CREATE TABLE "SafetySdsEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "initialAmount" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SafetySdsEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SafetySdsEntry_title_idx" ON "SafetySdsEntry"("title");

-- CreateIndex
CREATE INDEX "SafetySdsEntry_category_idx" ON "SafetySdsEntry"("category");
