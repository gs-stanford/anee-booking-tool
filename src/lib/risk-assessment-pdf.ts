import { RiskAssessmentLevel } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import {
  buildRiskAssessmentPdfFileName,
  formatRiskAssessmentLevel,
  parseRiskAssessmentHazardsJson
} from "@/lib/risk-assessment";
import { formatDate } from "@/lib/utils";

type RiskAssessmentPdfRecord = {
  experimentName: string;
  location: string;
  startDate: Date;
  endDate: Date;
  procedureDescription: string;
  riskLevel: RiskAssessmentLevel;
  hazardsJson: string;
  ppe: string;
  emergencyInstructions: string;
  specialMonitoring: string | null;
  furtherControlMeasures: string | null;
  specialistApproval: string | null;
  outOfHoursLoneWorking: string | null;
  assessorName: string;
  assessorEmail: string;
  supervisorName: string;
  additionalUsers: string | null;
  createdAt: Date;
};

type PageState = {
  page: Awaited<ReturnType<PDFDocument["addPage"]>>;
  y: number;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 50;
const TOP_MARGIN = 54;
const BOTTOM_MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

function wrapText(text: string, maxWidth: number, font: any, size: number) {
  const normalized = text.replace(/\r/g, "");
  const paragraphs = normalized.split("\n");
  const lines: string[] = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      lines.push("");
      return;
    }

    let current = words[0] ?? "";

    for (let index = 1; index < words.length; index += 1) {
      const candidate = `${current} ${words[index]}`;

      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = words[index] ?? "";
      }
    }

    lines.push(current);

    if (paragraphIndex < paragraphs.length - 1) {
      lines.push("");
    }
  });

  return lines;
}

function drawTextLine(page: any, text: string, x: number, y: number, size: number, font: any, color = rgb(0.13, 0.12, 0.11)) {
  page.drawText(text, {
    x,
    y,
    size,
    font,
    color
  });
}

function createNewPage(pdf: PDFDocument): PageState {
  return {
    page: pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    y: PAGE_HEIGHT - TOP_MARGIN
  };
}

function ensureSpace(pdf: PDFDocument, state: PageState, height: number) {
  if (state.y - height >= BOTTOM_MARGIN) {
    return state;
  }

  return createNewPage(pdf);
}

function drawSectionTitle(pdf: PDFDocument, state: PageState, title: string, headingFont: any, bodyFont: any) {
  const nextState = ensureSpace(pdf, state, 28);
  drawTextLine(nextState.page, title, MARGIN_X, nextState.y, 14, headingFont, rgb(0.55, 0.08, 0.08));
  nextState.page.drawLine({
    start: { x: MARGIN_X, y: nextState.y - 6 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: nextState.y - 6 },
    color: rgb(0.86, 0.84, 0.82),
    thickness: 1
  });
  return {
    ...nextState,
    y: nextState.y - 22
  };
}

function drawLabeledBlock(
  pdf: PDFDocument,
  state: PageState,
  label: string,
  value: string,
  headingFont: any,
  bodyFont: any,
  options?: { minHeight?: number }
) {
  const safeValue = value.trim() || "—";
  const lines = wrapText(safeValue, CONTENT_WIDTH, bodyFont, 11);
  const minHeight = options?.minHeight ?? 0;
  const textHeight = lines.length * 14;
  const blockHeight = Math.max(textHeight + 22, minHeight);
  const nextState = ensureSpace(pdf, state, blockHeight + 8);

  drawTextLine(nextState.page, label, MARGIN_X, nextState.y, 11, headingFont);
  let currentY = nextState.y - 16;

  lines.forEach((line) => {
    drawTextLine(nextState.page, line, MARGIN_X, currentY, 11, bodyFont, rgb(0.22, 0.21, 0.19));
    currentY -= 14;
  });

  return {
    ...nextState,
    y: nextState.y - blockHeight - 4
  };
}

export async function buildRiskAssessmentPdf(record: RiskAssessmentPdfRecord) {
  const pdf = await PDFDocument.create();
  const headingFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);

  let state = createNewPage(pdf);

  drawTextLine(state.page, "The Boies Group Risk Assessment", MARGIN_X, state.y, 22, headingFont);
  drawTextLine(
    state.page,
    `Generated ${formatDate(record.createdAt)} • ${formatRiskAssessmentLevel(record.riskLevel)} risk`,
    MARGIN_X,
    state.y - 24,
    11,
    bodyFont,
    rgb(0.42, 0.4, 0.37)
  );
  state.y -= 48;

  state = drawSectionTitle(pdf, state, "Experiment Overview", headingFont, bodyFont);
  state = drawLabeledBlock(pdf, state, "Project / experiment / activity", record.experimentName, headingFont, bodyFont);
  state = drawLabeledBlock(pdf, state, "Location of experiment", record.location, headingFont, bodyFont);
  state = drawLabeledBlock(
    pdf,
    state,
    "Start and end dates",
    `${formatDate(record.startDate)} to ${formatDate(record.endDate)}`,
    headingFont,
    bodyFont
  );
  state = drawLabeledBlock(
    pdf,
    state,
    "Brief description / procedure",
    record.procedureDescription,
    headingFont,
    bodyFont,
    { minHeight: 90 }
  );
  state = drawLabeledBlock(
    pdf,
    state,
    "Overall risk level",
    record.riskLevel === RiskAssessmentLevel.HIGH
      ? "High — download and obtain PI signature before the experiment proceeds."
      : formatRiskAssessmentLevel(record.riskLevel),
    headingFont,
    bodyFont
  );

  state = drawSectionTitle(pdf, state, "Hazards and Controls", headingFont, bodyFont);

  const hazards = parseRiskAssessmentHazardsJson(record.hazardsJson);

  if (hazards.length === 0) {
    state = drawLabeledBlock(pdf, state, "Hazard review", "No hazards were recorded.", headingFont, bodyFont);
  } else {
    hazards.forEach((hazardRow, index) => {
      state = drawLabeledBlock(
        pdf,
        state,
        `Hazard ${index + 1}`,
        [
          `Hazard: ${hazardRow.hazard || "—"}`,
          `Effect: ${hazardRow.effect || "—"}`,
          `Control measures: ${hazardRow.controlMeasures || "—"}`,
          `Residual risk: ${hazardRow.residualRisk || "—"}`
        ].join("\n"),
        headingFont,
        bodyFont,
        { minHeight: 84 }
      );
    });
  }

  state = drawSectionTitle(pdf, state, "PPE and Emergency Planning", headingFont, bodyFont);
  state = drawLabeledBlock(pdf, state, "Required PPE", record.ppe, headingFont, bodyFont, { minHeight: 60 });
  state = drawLabeledBlock(
    pdf,
    state,
    "Emergency instructions and first aid",
    record.emergencyInstructions,
    headingFont,
    bodyFont,
    { minHeight: 76 }
  );
  state = drawLabeledBlock(
    pdf,
    state,
    "Special monitoring required",
    record.specialMonitoring || "None noted.",
    headingFont,
    bodyFont
  );
  state = drawLabeledBlock(
    pdf,
    state,
    "Further control measures required",
    record.furtherControlMeasures || "No additional control measures listed.",
    headingFont,
    bodyFont
  );
  state = drawLabeledBlock(
    pdf,
    state,
    "Biological / laser / radiation approval",
    record.specialistApproval || "No specialist approval details entered.",
    headingFont,
    bodyFont
  );
  state = drawLabeledBlock(
    pdf,
    state,
    "Out-of-hours / lone working",
    record.outOfHoursLoneWorking || "No out-of-hours or lone-working notes entered.",
    headingFont,
    bodyFont
  );

  state = drawSectionTitle(pdf, state, "Assessor and Supervisor", headingFont, bodyFont);
  state = drawLabeledBlock(pdf, state, "Name of assessor", record.assessorName, headingFont, bodyFont);
  state = drawLabeledBlock(pdf, state, "Assessor email", record.assessorEmail, headingFont, bodyFont);
  state = drawLabeledBlock(pdf, state, "Name of supervisor / PI", record.supervisorName, headingFont, bodyFont);
  state = drawLabeledBlock(
    pdf,
    state,
    "Additional users",
    record.additionalUsers || "No additional users listed.",
    headingFont,
    bodyFont
  );

  state = ensureSpace(pdf, state, 140);
  drawTextLine(
    state.page,
    "Signature lines",
    MARGIN_X,
    state.y,
    14,
    headingFont,
    rgb(0.55, 0.08, 0.08)
  );
  state.page.drawLine({
    start: { x: MARGIN_X, y: state.y - 8 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: state.y - 8 },
    color: rgb(0.86, 0.84, 0.82),
    thickness: 1
  });

  const signatureTop = state.y - 40;
  const signatureWidth = 200;
  const dateWidth = 100;

  drawTextLine(state.page, "Assessor signature", MARGIN_X, signatureTop + 18, 11, bodyFont);
  state.page.drawLine({
    start: { x: MARGIN_X, y: signatureTop },
    end: { x: MARGIN_X + signatureWidth, y: signatureTop },
    color: rgb(0.22, 0.21, 0.19),
    thickness: 1
  });
  drawTextLine(state.page, "Date", MARGIN_X + signatureWidth + 34, signatureTop + 18, 11, bodyFont);
  state.page.drawLine({
    start: { x: MARGIN_X + signatureWidth + 34, y: signatureTop },
    end: { x: MARGIN_X + signatureWidth + 34 + dateWidth, y: signatureTop },
    color: rgb(0.22, 0.21, 0.19),
    thickness: 1
  });

  drawTextLine(state.page, "Supervisor / PI signature", MARGIN_X, signatureTop - 54 + 18, 11, bodyFont);
  state.page.drawLine({
    start: { x: MARGIN_X, y: signatureTop - 54 },
    end: { x: MARGIN_X + signatureWidth, y: signatureTop - 54 },
    color: rgb(0.22, 0.21, 0.19),
    thickness: 1
  });
  drawTextLine(state.page, "Date", MARGIN_X + signatureWidth + 34, signatureTop - 54 + 18, 11, bodyFont);
  state.page.drawLine({
    start: { x: MARGIN_X + signatureWidth + 34, y: signatureTop - 54 },
    end: { x: MARGIN_X + signatureWidth + 34 + dateWidth, y: signatureTop - 54 },
    color: rgb(0.22, 0.21, 0.19),
    thickness: 1
  });

  drawTextLine(
    state.page,
    "Use the signed PDF for high-risk experiments or whenever PI approval is required.",
    MARGIN_X,
    signatureTop - 104,
    10,
    bodyFont,
    rgb(0.42, 0.4, 0.37)
  );

  return {
    bytes: await pdf.save(),
    fileName: buildRiskAssessmentPdfFileName(record.experimentName)
  };
}
