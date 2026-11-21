ALTER TABLE "LabEvent" ADD COLUMN "eventType" TEXT NOT NULL DEFAULT 'event';
ALTER TABLE "LabEvent" ADD COLUMN "notes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LabEvent" ADD COLUMN "teamsEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "OutlookMeeting" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "eventId" TEXT,
 "userId" TEXT NOT NULL,
 "remoteId" TEXT NOT NULL,
 "joinUrl" TEXT NOT NULL,
 "contentHash" TEXT NOT NULL,
 CONSTRAINT "OutlookMeeting_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "LabEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT "OutlookMeeting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "OutlookConnection" ("userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OutlookMeeting_eventId_key" ON "OutlookMeeting"("eventId");
CREATE INDEX "OutlookMeeting_userId_idx" ON "OutlookMeeting"("userId");
