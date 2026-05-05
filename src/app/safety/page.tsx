import Link from "next/link";
import { RiskAssessmentLevel } from "@prisma/client";

import { createRiskAssessmentAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { RiskHazardBuilder } from "@/components/risk-hazard-builder";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRiskAssessmentLevel } from "@/lib/risk-assessment";
import { formatDate, getNotice, getSingleParam } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;
type SafetyTab = "risk-assessment" | "chemical-disposals" | "sds";

const sdsFolderUrl =
  process.env.SAFETY_SDS_FOLDER_URL ??
  "https://office365stanford.sharepoint.com/:f:/r/sites/SU-Group-ME-Boies-ANEE-LabConcerns/Shared%20Documents/5.%20Safety/C.%20SDS?csf=1&web=1&e=uaeuAz";

const wasteDisposalUrl = "https://ehs.stanford.edu/topic/waste-disposal";
const wasteHandlingUrl = "https://ehs.stanford.edu/topic/waste-disposal/handling-storing-waste";
const recognizingWasteUrl = "https://ehs.stanford.edu/topic/waste-disposal/recognizing-waste";
const wasteTagUrl = "https://ehs.stanford.edu/reference/wastetag-program";

function getActiveTab(searchParams?: SearchParams): SafetyTab {
  const requestedTab = getSingleParam(searchParams, "tab");

  if (
    requestedTab === "risk-assessment" ||
    requestedTab === "chemical-disposals" ||
    requestedTab === "sds"
  ) {
    return requestedTab;
  }

  return "risk-assessment";
}

function SafetyTabLink({
  active,
  href,
  label
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link className={`button button-small ${active ? "button-secondary" : "button-ghost"}`} href={href}>
      {label}
    </Link>
  );
}

function RiskAssessmentBadge({ level }: { level: RiskAssessmentLevel }) {
  const label = formatRiskAssessmentLevel(level);
  const className =
    level === RiskAssessmentLevel.HIGH
      ? "risk-level-badge risk-level-badge-high"
      : level === RiskAssessmentLevel.MEDIUM
        ? "risk-level-badge risk-level-badge-medium"
        : "risk-level-badge risk-level-badge-low";

  return <span className={className}>{label} risk</span>;
}

function ChemicalDisposalsTab() {
  return (
    <div className="page-stack">
      <section className="panel">
        <div className="section-head">
          <div>
            <h2>Chemical Disposals</h2>
            <p className="muted">
              This section condenses the Stanford EH&amp;S waste-disposal workflow for day-to-day lab use. When in
              doubt, follow EH&amp;S directly and request help before disposing anything.
            </p>
          </div>
          <a className="button button-primary" href={wasteDisposalUrl} rel="noreferrer" target="_blank">
            Open Stanford EH&amp;S
          </a>
        </div>
      </section>

      <div className="detail-grid">
        <section className="panel">
          <h3>Before you dispose anything</h3>
          <ul className="safety-bullet-list">
            <li>Assume unknown or unwanted lab chemicals are hazardous waste unless EH&amp;S has approved another path.</li>
            <li>Do not drain-dispose, evaporate, or trash chemicals unless Stanford EH&amp;S explicitly allows it.</li>
            <li>Figure out whether the material is hazardous, universal waste, mixed waste, or sharps before you move it.</li>
            <li>Keep incompatible wastes segregated from the moment you start collecting them.</li>
          </ul>
          <div className="inline-actions">
            <a className="button button-secondary" href={recognizingWasteUrl} rel="noreferrer" target="_blank">
              How Stanford classifies waste
            </a>
          </div>
        </section>

        <section className="panel">
          <h3>Container and storage rules</h3>
          <ul className="safety-bullet-list">
            <li>Label the container as soon as the first drop of waste goes in. Do not wait until it is full.</li>
            <li>List full chemical names and approximate percentages that total 100%; avoid abbreviations or formulas only.</li>
            <li>Keep waste containers closed except during active filling and use screw-top containers that are compatible with the waste.</li>
            <li>Store waste in secondary containment sized for leaks and keep it near the generating process, not in hallways.</li>
            <li>Stanford EH&amp;S notes the standard lab accumulation limit of 55 gallons, or 1 quart for acute hazardous waste.</li>
          </ul>
          <div className="inline-actions">
            <a className="button button-secondary" href={wasteHandlingUrl} rel="noreferrer" target="_blank">
              Handling and storage details
            </a>
          </div>
        </section>
      </div>

      <div className="detail-grid">
        <section className="panel">
          <h3>Pickup workflow</h3>
          <ol className="safety-bullet-list">
            <li>Confirm the waste type and packaging first.</li>
            <li>Create or update the waste label in Stanford&apos;s WasteTag system.</li>
            <li>Request pickup before containers over-accumulate or linger in the lab.</li>
            <li>Keep the container accessible for EH&amp;S and ready to move without repackaging.</li>
          </ol>
          <div className="inline-actions">
            <a className="button button-primary" href={wasteTagUrl} rel="noreferrer" target="_blank">
              Open WasteTag guidance
            </a>
          </div>
        </section>

        <section className="panel">
          <h3>Need help right now?</h3>
          <p className="muted">
            If you are unsure whether something can be discarded, held, neutralized, or shipped, stop and ask EH&amp;S
            first. Safety-wise, the expensive move is the wrong move.
          </p>
          <ul className="safety-bullet-list">
            <li>Use the EH&amp;S waste-disposal pages above for chemical, sharps, universal, and mixed-waste guidance.</li>
            <li>Call emergency services immediately for spills, fires, or acute exposures.</li>
            <li>Use the lab&apos;s SOPs plus EH&amp;S when waste is tied to pressurized systems, nanoparticles, pyrophorics, or toxic gas work.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function SdsTab() {
  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h2>SDS</h2>
          <p className="muted">
            All Safety Data Sheets stay in the shared ANEE Safety SharePoint folder so the lab only maintains one
            source of truth.
          </p>
        </div>
        <a className="button button-primary" href={sdsFolderUrl} rel="noreferrer" target="_blank">
          Open SDS documents
        </a>
      </div>

      <p className="muted" style={{ marginBottom: 0 }}>
        Use this whenever you need the latest vendor SDS, storage guidance, or emergency handling sheet for a chemical
        already used in the lab.
      </p>
    </section>
  );
}

export default async function SafetyPage({
  searchParams
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const user = await requireUser();
  const resolvedSearchParams = await searchParams;
  const notice = getNotice(resolvedSearchParams);
  const activeTab = getActiveTab(resolvedSearchParams);

  const riskAssessments = await db.riskAssessment.findMany({
    orderBy: [
      {
        createdAt: "desc"
      }
    ],
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
        <div className="section-head">
          <div>
            <h1>Safety</h1>
            <p className="muted">
              Lab safety now lives in one place: risk assessments, chemical-disposal guidance, and the SDS document
              library.
            </p>
          </div>
        </div>

        {notice ? <Notice message={notice.message} type={notice.type} /> : null}

        <div className="inline-actions safety-tab-toolbar">
          <SafetyTabLink active={activeTab === "risk-assessment"} href="/safety?tab=risk-assessment" label="Risk Assessment" />
          <SafetyTabLink
            active={activeTab === "chemical-disposals"}
            href="/safety?tab=chemical-disposals"
            label="Chemical Disposals"
          />
          <SafetyTabLink active={activeTab === "sds"} href="/safety?tab=sds" label="SDS" />
        </div>
      </section>

      {activeTab === "risk-assessment" ? (
        <>
          <section className="panel">
            <div className="section-head">
              <div>
                <h2>Risk Assessment</h2>
                <p className="muted">
                  Record experiment risks before work starts. High-risk assessments should be downloaded as a PDF and
                  signed by Adam before the experiment proceeds.
                </p>
              </div>

              <div className="inline-actions">
                <a className="button button-primary" href="#risk-assessment-form">
                  Fill Risk Assessment
                </a>
                <a className="button button-secondary" href={sdsFolderUrl} rel="noreferrer" target="_blank">
                  Open SDS folder
                </a>
              </div>
            </div>
          </section>

          <section className="panel" id="risk-assessment-list">
            <div className="section-head">
              <div>
                <h2>Filed Risk Assessments</h2>
                <p className="muted">
                  Review who filed each assessment, when it was filed, and download a signed PDF version whenever you
                  need a hard-copy approval trail.
                </p>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Experiment</th>
                    <th>Assessor</th>
                    <th>Date filed</th>
                    <th>Risk level</th>
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
                          <div className="muted">
                            {formatDate(assessment.startDate)} to {formatDate(assessment.endDate)}
                          </div>
                        </td>
                        <td>
                          {assessment.createdBy?.name ?? assessment.assessorName}
                          <div className="muted">{assessment.assessorEmail}</div>
                        </td>
                        <td>{formatDate(assessment.createdAt)}</td>
                        <td>
                          <RiskAssessmentBadge level={assessment.riskLevel} />
                          {assessment.riskLevel === RiskAssessmentLevel.HIGH ? (
                            <div className="muted" style={{ marginTop: 6 }}>
                              PI signature required
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <a
                            className="button button-small button-ghost"
                            href={`/api/risk-assessments/${assessment.id}/pdf`}
                          >
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

          <form action={createRiskAssessmentAction} className="panel page-stack" id="risk-assessment-form">
            <input name="returnTo" type="hidden" value="/safety?tab=risk-assessment" />

            <div className="section-head">
              <div>
                <h2>New Risk Assessment</h2>
                <p className="muted">
                  This mirrors the lab&apos;s blank Boies Group assessment template, but keeps the record searchable and
                  downloadable inside the tool.
                </p>
              </div>
            </div>

            <div className="form-grid two-up">
              <div className="field">
                <label htmlFor="experimentName">Title of project / experiment / activity</label>
                <input id="experimentName" name="experimentName" placeholder="Catalyst coating run with CNT aerosol monitoring" required />
              </div>

              <div className="field">
                <label htmlFor="location">Location of experiment</label>
                <input id="location" name="location" placeholder="Room 210, hood 3, glovebox bench" required />
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
                <p className="field-hint">Choose High when PI sign-off is required before running the experiment.</p>
              </div>
            </div>

            <div className="field">
              <label htmlFor="procedureDescription">Brief description / procedure / protocol</label>
              <textarea
                id="procedureDescription"
                name="procedureDescription"
                placeholder="Summarize the procedure or paste the SOP reference for the experiment."
                required
              />
            </div>

            <RiskHazardBuilder />

            <div className="form-grid two-up">
              <div className="field">
                <label htmlFor="ppe">Personal protective equipment required</label>
                <textarea
                  id="ppe"
                  name="ppe"
                  placeholder="Eye protection, gloves, respirator, lab coat, hearing protection..."
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="emergencyInstructions">Emergency instructions &amp; first aid</label>
                <textarea
                  id="emergencyInstructions"
                  name="emergencyInstructions"
                  placeholder="Spill response, emergency shutdown, first-aid action, exposure response..."
                  required
                />
              </div>
            </div>

            <div className="form-grid two-up">
              <div className="field">
                <label htmlFor="specialMonitoring">Special monitoring required</label>
                <textarea
                  id="specialMonitoring"
                  name="specialMonitoring"
                  placeholder="Hearing tests, gas monitoring, vibration monitoring, health surveillance..."
                />
              </div>

              <div className="field">
                <label htmlFor="furtherControlMeasures">Further control measures / actions required</label>
                <textarea
                  id="furtherControlMeasures"
                  name="furtherControlMeasures"
                  placeholder="Any remaining actions before the experiment can proceed."
                />
              </div>
            </div>

            <div className="form-grid two-up">
              <div className="field">
                <label htmlFor="specialistApproval">Biological / laser / radiation approval</label>
                <textarea
                  id="specialistApproval"
                  name="specialistApproval"
                  placeholder="Record specialist approval details, safety officer signature requirements, or approval notes."
                />
              </div>

              <div className="field">
                <label htmlFor="outOfHoursLoneWorking">Out-of-hours / lone working</label>
                <textarea
                  id="outOfHoursLoneWorking"
                  name="outOfHoursLoneWorking"
                  placeholder="State whether lone working is planned and what controls are in place."
                />
              </div>
            </div>

            <div className="form-grid three-up">
              <div className="field">
                <label htmlFor="assessorName">Name of assessor</label>
                <input defaultValue={user.name} id="assessorName" name="assessorName" required />
              </div>

              <div className="field">
                <label htmlFor="assessorEmail">Assessor email</label>
                <input defaultValue={user.email} id="assessorEmail" name="assessorEmail" required type="email" />
              </div>

              <div className="field">
                <label htmlFor="supervisorName">Name of supervisor / PI</label>
                <input defaultValue="Adam Boies" id="supervisorName" name="supervisorName" required />
              </div>
            </div>

            <div className="field">
              <label htmlFor="additionalUsers">Additional users</label>
              <textarea
                id="additionalUsers"
                name="additionalUsers"
                placeholder="List additional users who will read and follow this assessment."
              />
            </div>

            <div className="selection-summary">
              <span className="tag">Signature workflow</span>
              <h3 style={{ marginTop: 12 }}>High-risk experiments should leave the app with a PDF.</h3>
              <p className="muted" style={{ marginBottom: 0 }}>
                After you save the assessment, use the download button in the list above to print the filled PDF and get
                Adam&apos;s signature where required.
              </p>
            </div>

            <div className="inline-actions">
              <button className="button button-primary" type="submit">
                Save risk assessment
              </button>
            </div>
          </form>
        </>
      ) : activeTab === "chemical-disposals" ? (
        <ChemicalDisposalsTab />
      ) : (
        <SdsTab />
      )}
    </div>
  );
}
