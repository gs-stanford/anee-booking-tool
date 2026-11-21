ALTER TABLE "User" ADD COLUMN "calendarFeedToken" TEXT;
CREATE UNIQUE INDEX "User_calendarFeedToken_key" ON "User"("calendarFeedToken");
CREATE TABLE "ReservationInvite" (
 "reservationId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 PRIMARY KEY ("reservationId", "userId"),
 FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ReservationInvite_userId_idx" ON "ReservationInvite"("userId");
CREATE TABLE "LabEventInvite" (
 "eventId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 PRIMARY KEY ("eventId", "userId"),
 FOREIGN KEY ("eventId") REFERENCES "LabEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LabEventInvite_userId_idx" ON "LabEventInvite"("userId");
