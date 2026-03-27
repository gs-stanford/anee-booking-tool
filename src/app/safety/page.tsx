import { SafetyMaterialFlow } from "@prisma/client";

import { createSafetyMaterialLogAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, getNotice } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

const sdsFolderUrl =
  process.env.SAFETY_SDS_FOLDER_URL ??
  "https://office365stanford.sharepoint.com/:f:/r/sites/SU-Group-ME-Boies-ANEE-LabConcerns/Shared%20Documents/5.%20Safety/C.%20SDS?csf=1&web=1&e=uaeuAz";

function getSectionCopy(flow: SafetyMaterialFlow) {
  return flow === SafetyMaterialFlow.INCOMING
    ? {
        title: "Incoming Materials",
        description: "Log materials as they arrive in the lab.",
        buttonLabel: "Log incoming material",
        dateLabel: "Date ordered"
      }
    : {
        title: "Outgoing Materials",
        description: "Log materials when they are discarded or leave the lab.",
        buttonLabel: "Log outgoing material",
        dateLabel: "Date discarded"
      };
}

function MaterialLogSection({
  flow,
  entries
}: {
  flow: SafetyMaterialFlow;
  entries: Array<{
    id: string;
    title: string;
    vendor: string;
    category: string;
    initialAmount: string;
    loggedAt: Date;
    createdAt: Date;
    loggedBy: {
      name: string;
    } | null;
  }>;
}) {
  const copy = getSectionCopy(flow);

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h2>{copy.title}</h2>
          <p className="muted">{copy.description}</p>
        </div>
      </div>

      <div className="safety-log-grid">
        <form action={createSafetyMaterialLogAction} className="panel safety-log-form">
          <input name="returnTo" type="hidden" value="/safety" />
          <input name="flow" type="hidden" value={flow} />

          <div className="field">
            <label htmlFor={`${flow}-title`}>Title</label>
            <input id={`${flow}-title`} name="title" placeholder="Acetone ACS 4L" required />
          </div>

          <div className="form-grid two-up">
            <div className="field">
              <label htmlFor={`${flow}-vendor`}>Vendor</label>
              <input id={`${flow}-vendor`} name="vendor" placeholder="Sigma Aldrich" required />
            </div>

            <div className="field">
              <label htmlFor={`${flow}-category`}>Category</label>
              <input id={`${flow}-category`} name="category" placeholder="Solvent" required />
            </div>
          </div>

          <div className="form-grid two-up">
            <div className="field">
              <label htmlFor={`${flow}-amount`}>Amount ordered initially</label>
              <input id={`${flow}-amount`} name="initialAmount" placeholder="4 L" required />
            </div>

            <div className="field">
              <label htmlFor={`${flow}-date`}>{copy.dateLabel}</label>
              <input id={`${flow}-date`} name="loggedAt" required type="date" />
            </div>
          </div>

          <button className="button button-primary" type="submit">
            {copy.buttonLabel}
          </button>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Vendor</th>
                <th>Category</th>
                <th>Initial amount</th>
                <th>{copy.dateLabel}</th>
                <th>Logged by</th>
                <th>Logged at</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td className="muted" colSpan={7}>
                    No entries have been logged yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.title}</td>
                    <td>{entry.vendor}</td>
                    <td>{entry.category}</td>
                    <td>{entry.initialAmount}</td>
                    <td>{formatDate(entry.loggedAt)}</td>
                    <td>{entry.loggedBy?.name ?? "Lab member"}</td>
                    <td>{formatDateTime(entry.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default async function SafetyPage({
  searchParams
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  await requireUser();
  const notice = getNotice(await searchParams);

  const materialLogs = await db.safetyMaterialLog.findMany({
    orderBy: [
      {
        loggedAt: "desc"
      },
      {
        createdAt: "desc"
      }
    ],
    include: {
      loggedBy: {
        select: {
          name: true
        }
      }
    }
  });

  const incomingEntries = materialLogs.filter((entry) => entry.flow === SafetyMaterialFlow.INCOMING);
  const outgoingEntries = materialLogs.filter((entry) => entry.flow === SafetyMaterialFlow.OUTGOING);

  return (
    <div className="detail-grid">
      <section className="panel" style={{ gridColumn: "1 / -1" }}>
        <div className="section-head">
          <div>
            <h1>Safety</h1>
            <p className="muted">
              Track material flow inside the lab here. SDS files stay in the shared ANEE Safety folder on SharePoint.
            </p>
          </div>
          <a className="button button-secondary" href={sdsFolderUrl} rel="noreferrer" target="_blank">
            Open SDS folder
          </a>
        </div>

        {notice ? <Notice type={notice.type} message={notice.message} /> : null}
      </section>

      <MaterialLogSection entries={incomingEntries} flow={SafetyMaterialFlow.INCOMING} />
      <MaterialLogSection entries={outgoingEntries} flow={SafetyMaterialFlow.OUTGOING} />

      <section className="panel" style={{ gridColumn: "1 / -1" }}>
        <div className="section-head">
          <div>
            <h2>SDS</h2>
            <p className="muted">
              All Safety Data Sheets are stored directly in the shared SharePoint folder instead of being duplicated in
              this app.
            </p>
          </div>
          <a className="button button-primary" href={sdsFolderUrl} rel="noreferrer" target="_blank">
            Open SDS documents
          </a>
        </div>
      </section>
    </div>
  );
}
