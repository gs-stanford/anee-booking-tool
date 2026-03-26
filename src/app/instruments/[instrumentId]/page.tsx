import Link from "next/link";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";

import {
  addMaintenanceEntryAction,
  cancelReservationAction,
  createReservationAction,
  deleteInstrumentAction,
  deleteManualAction,
  updateReservationAction,
  uploadManualAction
} from "@/app/actions";
import { BookingCalendar } from "@/components/booking-calendar";
import { Notice } from "@/components/notice";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  addDays,
  formatDate,
  formatDateTime,
  getNotice,
  getSingleParam,
  startOfWeek,
  toDateInputValue
} from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function InstrumentDetailPage({
  params,
  searchParams
}: {
  params: { instrumentId: string } | Promise<{ instrumentId: string }>;
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { instrumentId } = await params;
  const resolvedSearchParams = await searchParams;
  const weekParam = getSingleParam(resolvedSearchParams, "week");
  const reservationId = getSingleParam(resolvedSearchParams, "reservationId");
  const parsedWeekOffset = Number(weekParam ?? "0");
  const weekOffset = Number.isFinite(parsedWeekOffset) ? Math.max(Math.min(parsedWeekOffset, 24), -24) : 0;
  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7));
  const weekEnd = addDays(weekStart, 7);

  const instrument = await db.instrument.findUnique({
    where: {
      id: instrumentId
    },
    include: {
      manuals: {
        orderBy: {
          uploadedAt: "desc"
        }
      },
      maintenanceEntries: {
        orderBy: {
          performedAt: "desc"
        },
        include: {
          performedBy: true
        }
      },
      reservations: {
        where: {
          startAt: {
            lt: weekEnd
          },
          endAt: {
            gte: weekStart
          }
        },
        orderBy: {
          startAt: "asc"
        },
        include: {
          user: true
        }
      }
    }
  });

  if (!instrument) {
    notFound();
  }

  const upcomingReservations = await db.reservation.findMany({
    where: {
      instrumentId,
      endAt: {
        gte: new Date()
      }
    },
    orderBy: {
      startAt: "asc"
    },
    take: 8,
    include: {
      user: true
    }
  });

  const notice = getNotice(resolvedSearchParams);
  const composeDate =
    getSingleParam(resolvedSearchParams, "composeDate") ?? toDateInputValue(weekStart);

  return (
    <div className="detail-grid">
      <section className="panel" style={{ gridColumn: "1 / -1" }}>
        <div className="section-head">
          <div>
            <Link href="/instruments" className="muted">
              Back to instruments
            </Link>
            <h1>{instrument.name}</h1>
            <div className="meta">
              <span>{instrument.location}</span>
              <span>{instrument.status}</span>
              <span>{instrument.manuals.length} manual(s)</span>
            </div>
          </div>
          {user.role === Role.ADMIN ? (
            <div className="inline-actions">
              <span className="tag">Admin controls available below</span>
              <form action={deleteInstrumentAction}>
                <input type="hidden" name="instrumentId" value={instrument.id} />
                <button className="button button-ghost button-small" type="submit">
                  Delete instrument
                </button>
              </form>
            </div>
          ) : (
            <span className="tag">Member booking view</span>
          )}
        </div>

        <p>{instrument.description}</p>
        {notice ? <Notice type={notice.type} message={notice.message} /> : null}
      </section>

      <div className="instrument-workspace" style={{ gridColumn: "1 / -1" }}>
      <section className="panel manuals-panel">
        <div className="section-head">
          <div>
            <h2>Manuals</h2>
            <p className="muted">Store instrument manuals as downloadable files tied directly to this instrument.</p>
          </div>
        </div>

        <div className="list" style={{ marginBottom: 18 }}>
          {instrument.manuals.length === 0 ? (
            <p className="muted">No manual uploaded yet.</p>
          ) : (
            instrument.manuals.map((manual) => (
              <div className="sheet-row" key={manual.id}>
                <div className="section-head">
                  <a href={`/api/manuals/${manual.id}`}>
                    <h4>{manual.originalName}</h4>
                  </a>
                  <form action={deleteManualAction}>
                    <input type="hidden" name="instrumentId" value={instrument.id} />
                    <input type="hidden" name="manualId" value={manual.id} />
                    <button className="button button-ghost button-small" type="submit">
                      Remove file
                    </button>
                  </form>
                </div>
                <div className="meta">
                  <span>Uploaded {formatDateTime(manual.uploadedAt)}</span>
                  <a href={`/api/manuals/${manual.id}`}>Download</a>
                </div>
              </div>
            ))
          )}
        </div>

        <form action={uploadManualAction} className="form-grid">
          <input type="hidden" name="instrumentId" value={instrument.id} />
          <div className="field">
            <label htmlFor="manual">Upload manual</label>
            <input id="manual" name="manual" type="file" accept=".pdf,.doc,.docx" required />
          </div>
          <button className="button button-secondary" type="submit">
            Save manual
          </button>
        </form>
      </section>

      <section className="panel booking-panel">
        <div className="section-head">
          <div>
            <h2>Reservation calendar</h2>
            <p className="muted">The calendar now owns the workflow: drag to select time blocks, then submit the reservation inline.</p>
          </div>
        </div>

        <BookingCalendar
          cancelAction={cancelReservationAction}
          composeDate={composeDate}
          createAction={createReservationAction}
          currentUserId={user.id}
          instrumentId={instrument.id}
          isAdmin={user.role === Role.ADMIN}
          key={`${weekOffset}-${composeDate}-${reservationId ?? "new"}`}
          reservations={instrument.reservations.map((reservation) => ({
            id: reservation.id,
            userId: reservation.userId,
            startAt: reservation.startAt.toISOString(),
            endAt: reservation.endAt.toISOString(),
            purpose: reservation.purpose,
            user: {
              name: reservation.user.name
            }
          }))}
          selectedReservationId={reservationId}
          upcomingReservations={upcomingReservations.map((reservation) => ({
            id: reservation.id,
            userId: reservation.userId,
            startAt: reservation.startAt.toISOString(),
            endAt: reservation.endAt.toISOString(),
            purpose: reservation.purpose,
            user: {
              name: reservation.user.name
            }
          }))}
          updateAction={updateReservationAction}
          weekOffset={weekOffset}
          weekStart={weekStart.toISOString()}
        />
      </section>
      </div>

      <section className="panel" style={{ gridColumn: "1 / -1" }}>
        <div className="section-head">
          <div>
            <h2>Maintenance sheet</h2>
            <p className="muted">
              This replaces the uploaded Excel concept with a live, always-loaded table for maintenance history.
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Performed by</th>
                <th>Status</th>
                <th>Summary</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {instrument.maintenanceEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No maintenance entries have been logged yet.
                  </td>
                </tr>
              ) : (
                instrument.maintenanceEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.performedAt)}</td>
                    <td>{entry.performedBy?.name ?? "Unassigned"}</td>
                    <td>{entry.status}</td>
                    <td>{entry.summary}</td>
                    <td>{entry.notes ?? "N/A"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <form action={addMaintenanceEntryAction} className="form-grid" style={{ marginTop: 20 }}>
          <input type="hidden" name="instrumentId" value={instrument.id} />
          <div className="form-grid two-up">
            <div className="field">
              <label htmlFor="performedAt">Maintenance date</label>
              <input id="performedAt" name="performedAt" type="date" required />
            </div>
            <div className="field">
              <label htmlFor="status">Status</label>
              <input id="status" name="status" placeholder="Passed calibration" required />
            </div>
          </div>

          <div className="field">
            <label htmlFor="summary">Summary</label>
            <input id="summary" name="summary" placeholder="Quarterly alignment and optics cleaning" required />
          </div>

          <div className="field">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" placeholder="Optional details, part replacements, or follow-up actions." />
          </div>

          <button className="button button-secondary" type="submit">
            Add maintenance row
          </button>
        </form>
      </section>
    </div>
  );
}
