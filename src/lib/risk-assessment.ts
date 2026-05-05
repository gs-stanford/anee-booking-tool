import { RiskAssessmentLevel } from "@prisma/client";

export type RiskAssessmentHazardRow = {
  hazard: string;
  effect: string;
  controlMeasures: string;
  residualRisk: string;
};

export function sanitizeRiskAssessmentHazards(
  rows: RiskAssessmentHazardRow[]
): RiskAssessmentHazardRow[] {
  return rows
    .map((row) => ({
      hazard: row.hazard.trim(),
      effect: row.effect.trim(),
      controlMeasures: row.controlMeasures.trim(),
      residualRisk: row.residualRisk.trim()
    }))
    .filter(
      (row) =>
        row.hazard.length > 0 ||
        row.effect.length > 0 ||
        row.controlMeasures.length > 0 ||
        row.residualRisk.length > 0
    );
}

export function parseRiskAssessmentHazardsJson(value: string): RiskAssessmentHazardRow[] {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return sanitizeRiskAssessmentHazards(
      parsed.map((row) => {
        const record = typeof row === "object" && row ? row : {};

        return {
          hazard: String((record as Record<string, unknown>).hazard ?? ""),
          effect: String((record as Record<string, unknown>).effect ?? ""),
          controlMeasures: String((record as Record<string, unknown>).controlMeasures ?? ""),
          residualRisk: String((record as Record<string, unknown>).residualRisk ?? "")
        };
      })
    );
  } catch {
    return [];
  }
}

export function formatRiskAssessmentLevel(level: RiskAssessmentLevel) {
  switch (level) {
    case RiskAssessmentLevel.HIGH:
      return "High";
    case RiskAssessmentLevel.MEDIUM:
      return "Medium";
    default:
      return "Low";
  }
}

export function buildRiskAssessmentPdfFileName(experimentName: string) {
  const safeName = experimentName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${safeName || "risk-assessment"}.pdf`;
}
