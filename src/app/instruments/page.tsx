import Link from "next/link";
import { Role } from "@prisma/client";

import { Notice } from "@/components/notice";
import { SharedReservationsOverview } from "@/components/shared-reservations-overview";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  serializeInstrumentUnavailabilityCalendarItems,
  serializeReservationCalendarItems
} from "@/lib/reservation-calendar";
import { summarizeReservations } from "@/lib/reservation-summary";
import { getLabDateKey } from "@/lib/lab-time";
import { formatDate, formatDateTime, getNotice } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function InstrumentsPage({
  searchParams
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const user = await requireUser();
  const notice = getNotice(await searchParams);
  const isTempUser = user.role === Role.TEMP;

  if (isTempUser && user.calendarAccessOnHold) {
    return (
      <div className="page-stack">
        <section className="panel">
          <div className="section-head">
            <div>
              <h1>Calendar access pending</h1>
              <p className="muted">
                This temporary account can use safety resources now, but instrument calendar booking is on hold until
                SDS review and glovebox walkthrough are approved by an admin.
              </p>
            </div>
          </div>
          {notice ? <Notice type={notice.type} message={notice.message} /> : null}
          <div className="inline-actions">
            <Link className="button button-primary" href="/safety">
              Open safety tools
            </Link>
            <Link className="button button-secondary" href="/safety/risk-assessment">
              Fill risk assessment
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const reservationWindowStart = new Date();
  reservationWindowStart.setMonth(reservationWindowStart.getMonth() - 6);
  reservationWindowStart.setDate(1);
  reservationWindowStart.setHours(0, 0, 0, 0);
  const reservationWindowEnd = new Date(reservationWindowStart);
  reservationWindowEnd.setMonth(reservationWindowEnd.getMonth() + 18);
  const instrumentWhere = isTempUser ? { temporaryAccessEnabled: true } : undefined;
  const reservationWhere = {
    endAt: {
      gte: reservationWindowStart
    },
    startAt: {
      lt: reservationWindowEnd
    },
    ...(isTempUser
      ? {
          instrument: {
            is: {
              temporaryAccessEnabled: true
            }
          }
        }
      : {})
  };

  const [instruments, sharedReservations] = await Promise.all([
    db.instrument.findMany({
      where: instrumentWhere,
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
      where: reservationWhere,
      orderBy: {
        startAt: "asc"
      },
      include: {
        instrument: true,
        user: true
      }
    })
  ]);

  const sharedReservationSummaries = summarizeReservations(
    sharedReservations.filter((reservation) => reservation.endAt >= new Date())
  ).slice(0, 10);
  const sharedReservationCalendarItems = [
    ...serializeReservationCalendarItems(sharedReservations),
    ...serializeInstrumentUnavailabilityCalendarItems(
      instruments,
      getLabDateKey(reservationWindowStart),
      getLabDateKey(reservationWindowEnd)
    )
  ];
  const getStatusClassName = (status: string) =>
    status === "AVAILABLE" ? "status-pill status-pill-available" : "status-pill status-pill-unavailable";

  if (isTempUser) {
    return (
      <div className="page-stack">
        <section className="panel" id="reservation-calendar">
          <div className="section-head">
            <div>
              <h1>Instrument calendar</h1>
              <p className="muted">
                Temporary access is limited to the shared reservation calendar and approved instrument booking pages.
              </p>
            </div>
          </div>

          {notice ? <Notice type={notice.type} message={notice.message} /> : null}

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

        <section className="panel">
          <div className="section-head">
            <div>
              <h2>Book an instrument</h2>
              <p className="muted">Open a calendar to request an approved reservation slot.</p>
            </div>
          </div>

          <div className="list">
            {instruments.length === 0 ? (
              <p className="muted">
                No instruments are currently enabled for temporary booking. Contact the lab admin.
              </p>
            ) : (
              instruments.map((instrument) => (
                <Link className="instrument-card" href={`/instruments/${instrument.id}`} key={instrument.id}>
                  <div className="section-head">
                    <div>
                      <h3>{instrument.name}</h3>
                      <div className="meta">
                        <span>{instrument.location}</span>
                        <span className={getStatusClassName(instrument.status)}>
                          {instrument.status === "AVAILABLE" ? "Available" : "Unavailable"}
                        </span>
                        {instrument.owner?.email ? <span>Owner: {instrument.owner.email}</span> : null}
                      </div>
                    </div>
                    <span className="tag">Open calendar</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    );
  }

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
                  {instrument.status === "UNAVAILABLE" && instrument.unavailableUntil ? (
                    <p className="muted">Unavailable until: {formatDate(instrument.unavailableUntil)}</p>
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
