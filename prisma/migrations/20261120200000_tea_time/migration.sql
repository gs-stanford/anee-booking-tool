CREATE TABLE "TeaTimeSession" (
  "date" TEXT NOT NULL PRIMARY KEY,
  "presenterName" TEXT,
  "signupEnabled" BOOLEAN NOT NULL DEFAULT false,
  "presenterId" TEXT,
  CONSTRAINT "TeaTimeSession_presenterId_fkey" FOREIGN KEY ("presenterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "TeaTimeSession_presenterId_idx" ON "TeaTimeSession"("presenterId");
INSERT INTO "TeaTimeSession" ("date", "presenterName", "signupEnabled") VALUES
('2027-01-04', 'Gaurav Sharma', false),
('2027-01-11', 'Nate Giessner', false),
('2027-01-25', 'Julie Pongetti', false),
('2027-02-01', 'Hao Zhang', false),
('2027-02-08', 'Omar Allaham', false),
('2027-02-22', 'Michael', false),
('2027-03-01', 'Maddie', false),
('2027-03-08', 'Sophia Sonnert', false),
('2027-03-29', NULL, true),
('2027-04-05', 'Cheyenne', false);
