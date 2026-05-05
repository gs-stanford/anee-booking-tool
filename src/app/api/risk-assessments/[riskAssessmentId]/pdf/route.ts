import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildRiskAssessmentPdf } from "@/lib/risk-assessment-pdf";

export async function GET(
  _request: Request,
  {
    params
  }: {
    params: { riskAssessmentId: string } | Promise<{ riskAssessmentId: string }>;
  }
) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized.", { status: 401 });
  }

  const { riskAssessmentId } = await params;

  const assessment = await db.riskAssessment.findUnique({
    where: {
      id: riskAssessmentId
    }
  });

  if (!assessment) {
    return new Response("Risk assessment not found.", { status: 404 });
  }

  const { bytes, fileName } = await buildRiskAssessmentPdf(assessment);

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
