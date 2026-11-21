DROP INDEX "User_calendarFeedToken_key";
ALTER TABLE "User" DROP COLUMN "calendarFeedToken";
CREATE TABLE "OutlookConnection" (
 "userId" TEXT NOT NULL PRIMARY KEY, "microsoftId" TEXT NOT NULL, "email" TEXT NOT NULL, "refreshToken" TEXT NOT NULL,
 "calendarId" TEXT, "lastSyncedAt" DATETIME, "lastError" TEXT, "lockUntil" DATETIME,
 FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OutlookConnection_microsoftId_key" ON "OutlookConnection"("microsoftId");
CREATE TABLE "OutlookSyncItem" (
 "userId" TEXT NOT NULL, "sourceKey" TEXT NOT NULL, "remoteId" TEXT NOT NULL, "contentHash" TEXT NOT NULL, "endAt" DATETIME NOT NULL,
 PRIMARY KEY ("userId", "sourceKey"),
 FOREIGN KEY ("userId") REFERENCES "OutlookConnection"("userId") ON DELETE CASCADE ON UPDATE CASCADE
);
