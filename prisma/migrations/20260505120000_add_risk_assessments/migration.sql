-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "experimentName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "procedureDescription" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "hazardsJson" TEXT NOT NULL,
    "ppe" TEXT NOT NULL,
    "emergencyInstructions" TEXT NOT NULL,
    "specialMonitoring" TEXT,
    "furtherControlMeasures" TEXT,
    "specialistApproval" TEXT,
    "outOfHoursLoneWorking" TEXT,
    "assessorName" TEXT NOT NULL,
    "assessorEmail" TEXT NOT NULL,
    "supervisorName" TEXT NOT NULL,
    "additionalUsers" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RiskAssessment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RiskAssessment_createdAt_idx" ON "RiskAssessment"("createdAt");

-- CreateIndex
CREATE INDEX "RiskAssessment_experimentName_idx" ON "RiskAssessment"("experimentName");

-- CreateIndex
CREATE INDEX "RiskAssessment_riskLevel_idx" ON "RiskAssessment"("riskLevel");
