import Link from "next/link";

import { Notice } from "@/components/notice";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getNotice } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function InstrumentsPage({
  searchParams
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  await requireUser();
  const instruments = await db.instrument.findMany({
    orderBy: {
      name: "asc"
    },
    include: {
      manuals: true,
      reservations: {
        where: {
          endAt: { gte: new Date() }
        },
        take: 1,
        orderBy: {
          startAt: "asc"
        }
      }
    }
  });

  const notice = getNotice(await searchParams);

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h1>Instrument hub</h1>
          <p className="muted">Browse instruments, open manuals, review maintenance history, and reserve time slots.</p>
        </div>
        <Link className="button button-primary" href="/instruments/new">
          Add new instrument
        </Link>
      </div>

      {notice ? <Notice type={notice.type} message={notice.message} /> : null}

      <div className="list">
        {instruments.length === 0 ? (
          <p className="muted">No instruments have been added yet.</p>
        ) : (
          instruments.map((instrument) => {
            const nextReservation = instrument.reservations[0];

            return (
              <Link className="instrument-card" href={`/instruments/${instrument.id}`} key={instrument.id}>
                <div className="section-head">
                  <div>
                    <h3>{instrument.name}</h3>
                    <div className="meta">
                      <span>{instrument.location}</span>
                      <span>{instrument.status}</span>
                      <span>{instrument.manuals.length} manual(s)</span>
                    </div>
                  </div>
                  <span className="tag">{nextReservation ? "Reserved soon" : "Open schedule"}</span>
                </div>
                <p>{instrument.description}</p>
                {nextReservation ? (
                  <p className="muted">
                    Next booking: {nextReservation.startAt.toLocaleDateString("en-US")} at{" "}
                    {nextReservation.startAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                ) : null}
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
