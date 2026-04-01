import Link from "next/link";

import { Notice } from "@/components/notice";
import { SharedReservationsOverview } from "@/components/shared-reservations-overview";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeReservationCalendarItems } from "@/lib/reservation-calendar";
import { summarizeReservations } from "@/lib/reservation-summary";
import { formatDateTime, getNotice } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function InstrumentsPage({
  searchParams
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  await requireUser();
  const reservationWindowStart = new Date();
  reservationWindowStart.setMonth(reservationWindowStart.getMonth() - 6);
  reservationWindowStart.setDate(1);
  reservationWindowStart.setHours(0, 0, 0, 0);
  const reservationWindowEnd = new Date(reservationWindowStart);
  reservationWindowEnd.setMonth(reservationWindowEnd.getMonth() + 18);

  const [instruments, sharedReservations] = await Promise.all([
    db.instrument.findMany({
      orderBy: {
        name: "asc"
      },
      include: {
        owner: true,
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
    }),
    db.reservation.findMany({
      where: {
        endAt: {
          gte: reservationWindowStart
        },
        startAt: {
          lt: reservationWindowEnd
        }
      },
      orderBy: {
        startAt: "asc"
      },
      include: {
        instrument: true,
        user: true
      }
    })
  ]);

  const notice = getNotice(await searchParams);
  const sharedReservationSummaries = summarizeReservations(
    sharedReservations.filter((reservation) => reservation.endAt >= new Date())
  ).slice(0, 10);
  const sharedReservationCalendarItems = serializeReservationCalendarItems(sharedReservations);
  const getStatusClassName = (status: string) =>
    status === "AVAILABLE" ? "status-pill status-pill-available" : "status-pill status-pill-unavailable";

  return (
    <div className="page-stack">
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
                        <span className={getStatusClassName(instrument.status)}>
                          {instrument.status === "AVAILABLE" ? "Available" : "Unavailable"}
                        </span>
                        <span>Owner: {instrument.owner?.name ?? "Unassigned"}</span>
                        <span>{instrument.manuals.length} manual(s)</span>
                      </div>
                    </div>
                    <span className="tag">{nextReservation ? "Reserved soon" : "Open schedule"}</span>
                  </div>
                  <p>{instrument.description}</p>
                  {instrument.status === "UNAVAILABLE" && instrument.statusNote ? (
                    <p className="muted">Unavailable note: {instrument.statusNote}</p>
                  ) : null}
                  {nextReservation ? (
                    <p className="muted">
                      Next booking: {formatDateTime(nextReservation.startAt)}
                    </p>
                  ) : null}
                </Link>
              );
            })
          )}
        </div>
      </section>

      <section className="panel" id="reservation-calendar">
        <div className="section-head">
          <div>
            <h2>Upcoming reservations</h2>
            <p className="muted">Switch between the shared calendar and the summarized reservation list.</p>
          </div>
        </div>

        <SharedReservationsOverview
          calendarItems={sharedReservationCalendarItems}
          defaultView="calendar"
          instrumentOptions={instruments.map((instrument) => ({
            id: instrument.id,
            name: instrument.name
          }))}
          summaries={sharedReservationSummaries}
        />
      </section>
    </div>
  );
}
