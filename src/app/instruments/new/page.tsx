import { InstrumentStatus } from "@prisma/client";

import { createInstrumentAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { getNotice } from "@/lib/utils";
import { requireUser } from "@/lib/auth";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function NewInstrumentPage({
  searchParams
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  await requireUser();
  const notice = getNotice(await searchParams);

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h1>Add a new instrument</h1>
          <p className="muted">Any signed-in lab member can create the core record first, then admins can add manuals if needed.</p>
        </div>
      </div>

      {notice ? <Notice type={notice.type} message={notice.message} /> : null}

      <form action={createInstrumentAction} className="form-grid">
        <div className="form-grid two-up">
          <div className="field">
            <label htmlFor="name">Instrument name</label>
            <input id="name" name="name" placeholder="Confocal Microscope" required />
          </div>

          <div className="field">
            <label htmlFor="location">Location</label>
            <input id="location" name="location" placeholder="Room 210, bench A" required />
          </div>
        </div>

        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={InstrumentStatus.AVAILABLE}>
            {Object.values(InstrumentStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="description">Description and usage notes</label>
          <textarea
            id="description"
            name="description"
            placeholder="What this instrument is used for, who relies on it, and any booking considerations."
            required
          />
        </div>

        <button className="button button-primary" type="submit">
          Save instrument
        </button>
      </form>
    </section>
  );
}
