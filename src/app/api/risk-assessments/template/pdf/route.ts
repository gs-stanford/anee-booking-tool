import { getCurrentUser } from "@/lib/auth";
import { buildBlankRiskAssessmentPdfTemplate } from "@/lib/risk-assessment-pdf";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized.", { status: 401 });
  }

  const { bytes, fileName } = await buildBlankRiskAssessmentPdfTemplate();

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
