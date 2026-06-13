import { createInstrumentAction } from "@/app/actions";
import { InstrumentStatusFields } from "@/components/instrument-status-fields";
import { Notice } from "@/components/notice";
import { getNotice } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function NewInstrumentPage({
  searchParams
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const user = await requireUser();
  const notice = getNotice(await searchParams);

  if (user.role === Role.TEMP) {
    return (
      <section className="panel">
        <div className="section-head">
          <div>
            <h1>Instrument creation unavailable</h1>
            <p className="muted">
              Temporary accounts are limited to safety resources and approved instrument calendar booking.
            </p>
          </div>
        </div>

        {notice ? <Notice type={notice.type} message={notice.message} /> : null}

        <div className="inline-actions">
          <Link className="button button-primary" href="/instruments">
            Open calendar
          </Link>
          <Link className="button button-secondary" href="/safety">
            Open safety tools
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h1>Add a new instrument</h1>
          <p className="muted">Any signed-in lab member can create the core record and become the owner for later availability updates.</p>
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

        <InstrumentStatusFields />

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
