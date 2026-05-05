import { RiskAssessmentLevel } from "@prisma/client";

import { createRiskAssessmentAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { RiskHazardBuilder } from "@/components/risk-hazard-builder";
import { SafetyNav } from "@/components/safety-nav";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRiskAssessmentLevel } from "@/lib/risk-assessment";
import { formatDate, getNotice } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

function RiskAssessmentBadge({ level }: { level: RiskAssessmentLevel }) {
  const label = formatRiskAssessmentLevel(level);
  const className =
    level === RiskAssessmentLevel.HIGH
      ? "risk-level-badge risk-level-badge-high"
      : level === RiskAssessmentLevel.MEDIUM
        ? "risk-level-badge risk-level-badge-medium"
        : "risk-level-badge risk-level-badge-low";

  return <span className={className}>{label}</span>;
}

export default async function RiskAssessmentPage({
  searchParams
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const user = await requireUser();
  const notice = getNotice(await searchParams);

  const riskAssessments = await db.riskAssessment.findMany({
    orderBy: {
      createdAt: "desc"
    },
    include: {
      createdBy: {
        select: {
          name: true
        }
      }
    }
  });

  return (
    <div className="page-stack">
      <section className="panel">
        <SafetyNav current="risk-assessment" />

        <div className="section-head">
          <div>
            <h1>Risk Assessment</h1>
            <p className="muted">
              Keep this page plain and functional: fill the form, save the assessment, and download a PDF when a signed
              approval is needed.
            </p>
          </div>
          <a className="button button-primary" href="#new-risk-assessment">
            Fill Risk Assessment
          </a>
        </div>

        {notice ? <Notice message={notice.message} type={notice.type} /> : null}
      </section>

      <section className="panel">
        <h2>Filed assessments</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Experiment</th>
                <th>Assessor</th>
                <th>Date</th>
                <th>Risk</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {riskAssessments.length === 0 ? (
                <tr>
                  <td className="muted" colSpan={5}>
                    No risk assessments have been filed yet.
                  </td>
                </tr>
              ) : (
                riskAssessments.map((assessment) => (
                  <tr key={assessment.id}>
                    <td>
                      <strong>{assessment.experimentName}</strong>
                    </td>
                    <td>{assessment.createdBy?.name ?? assessment.assessorName}</td>
                    <td>{formatDate(assessment.createdAt)}</td>
                    <td>
                      <RiskAssessmentBadge level={assessment.riskLevel} />
                    </td>
                    <td>
                      <a className="button button-small button-ghost" href={`/api/risk-assessments/${assessment.id}/pdf`}>
                        Download PDF
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <form action={createRiskAssessmentAction} className="panel risk-form-panel" id="new-risk-assessment">
        <input name="returnTo" type="hidden" value="/safety/risk-assessment" />

        <h2>New assessment</h2>

        <div className="form-grid two-up">
          <div className="field">
            <label htmlFor="experimentName">Title of project / experiment / activity</label>
            <input id="experimentName" name="experimentName" required />
          </div>

          <div className="field">
            <label htmlFor="location">Location of experiment</label>
            <input id="location" name="location" required />
          </div>
        </div>

        <div className="form-grid three-up">
          <div className="field">
            <label htmlFor="startDate">Start date</label>
            <input id="startDate" name="startDate" required type="date" />
          </div>

          <div className="field">
            <label htmlFor="endDate">End date</label>
            <input id="endDate" name="endDate" required type="date" />
          </div>

          <div className="field">
            <label htmlFor="riskLevel">Risk level</label>
            <select defaultValue={RiskAssessmentLevel.MEDIUM} id="riskLevel" name="riskLevel">
              <option value={RiskAssessmentLevel.LOW}>Low</option>
              <option value={RiskAssessmentLevel.MEDIUM}>Medium</option>
              <option value={RiskAssessmentLevel.HIGH}>High</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="procedureDescription">Brief description (or attach procedure / protocol separately)</label>
          <textarea id="procedureDescription" name="procedureDescription" required />
        </div>

        <div className="plain-form-stack">
          <div>
            <label className="form-section-label">Hazard assessment table</label>
            <p className="muted">Use one row per hazard. Keep the wording simple and specific.</p>
          </div>
          <RiskHazardBuilder />
        </div>

        <div className="form-grid two-up">
          <div className="field">
            <label htmlFor="ppe">Personal Protective Equipment required</label>
            <textarea id="ppe" name="ppe" required />
          </div>

          <div className="field">
            <label htmlFor="emergencyInstructions">Emergency Instructions &amp; First Aid</label>
            <textarea id="emergencyInstructions" name="emergencyInstructions" required />
          </div>
        </div>

        <div className="form-grid two-up">
          <div className="field">
            <label htmlFor="specialMonitoring">Any special monitoring required</label>
            <textarea id="specialMonitoring" name="specialMonitoring" />
          </div>

          <div className="field">
            <label htmlFor="furtherControlMeasures">Further control measures required</label>
            <textarea id="furtherControlMeasures" name="furtherControlMeasures" />
          </div>
        </div>

        <div className="form-grid two-up">
          <div className="field">
            <label htmlFor="specialistApproval">Biological / Laser / Radiation approval</label>
            <textarea id="specialistApproval" name="specialistApproval" />
          </div>

          <div className="field">
            <label htmlFor="outOfHoursLoneWorking">Out of hours / lone working</label>
            <textarea id="outOfHoursLoneWorking" name="outOfHoursLoneWorking" />
          </div>
        </div>

        <div className="form-grid three-up">
          <div className="field">
            <label htmlFor="assessorName">Name of Assessor</label>
            <input defaultValue={user.name} id="assessorName" name="assessorName" required />
          </div>

          <div className="field">
            <label htmlFor="assessorEmail">Email</label>
            <input defaultValue={user.email} id="assessorEmail" name="assessorEmail" required type="email" />
          </div>

          <div className="field">
            <label htmlFor="supervisorName">Name of Supervisor</label>
            <input defaultValue="Adam Boies" id="supervisorName" name="supervisorName" required />
          </div>
        </div>

        <div className="field">
          <label htmlFor="additionalUsers">Additional Users</label>
          <textarea id="additionalUsers" name="additionalUsers" />
        </div>

        <div className="hero-actions">
          <button className="button button-primary" type="submit">
            Save assessment
          </button>
        </div>
      </form>
    </div>
  );
}
