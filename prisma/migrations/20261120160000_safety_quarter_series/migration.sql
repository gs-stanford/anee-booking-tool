ALTER TABLE "SafetySignup" ADD COLUMN "seriesId" TEXT;
CREATE INDEX "SafetySignup_seriesId_idx" ON "SafetySignup"("seriesId");
