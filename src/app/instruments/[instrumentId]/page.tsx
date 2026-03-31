import Link from "next/link";
import { InstrumentStatus, Role } from "@prisma/client";
import { notFound } from "next/navigation";

import {
  addMaintenanceEntryAction,
  cancelReservationAction,
  claimInstrumentOwnershipAction,
  createReservationAction,
  deleteInstrumentAction,
  deleteManualAction,
  updateInstrumentStatusAction,
  updateReservationAction,
  uploadManualAction
} from "@/app/actions";
import { BookingCalendar } from "@/components/booking-calendar";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { InstrumentStatusFields } from "@/components/instrument-status-fields";
import { Notice } from "@/components/notice";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  formatDateKeyMonthDay,
  formatDateKeyShortDay,
  getLabDateKey,
  getLabTimeKey,
  getStartOfLabWeekDateKey,
  parseLabDateTime,
  shiftDateString,
  timeKeyToSlot
} from "@/lib/lab-time";
import {
  formatDate,
  formatDateTime,
  formatTime,
  getNotice,
  getSingleParam
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
  const todayDateKey = getLabDateKey(new Date());
  const weekStartDate = shiftDateString(getStartOfLabWeekDateKey(new Date()), weekOffset * 7);
  const weekEnd = parseLabDateTime(shiftDateString(weekStartDate, 7), "00:00");
  const weekStart = parseLabDateTime(weekStartDate, "00:00");
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDateString(weekStartDate, index);

    return {
      date,
      shortDay: formatDateKeyShortDay(date),
      monthDay: formatDateKeyMonthDay(date)
    };
  });

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
      },
      owner: true
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
  const composeDateParam = getSingleParam(resolvedSearchParams, "composeDate");
  const composeDate =
    composeDateParam && weekDays.some((day) => day.date === composeDateParam)
      ? composeDateParam
      : weekDays.some((day) => day.date === todayDateKey)
        ? todayDateKey
        : weekDays[0].date;
  const instrumentUnowned = !instrument.ownerId;
  const canManageInstrument = user.role === Role.ADMIN || instrument.ownerId === user.id;
  const statusLabel = instrument.status === InstrumentStatus.AVAILABLE ? "Available" : "Unavailable";
  const statusClassName =
    instrument.status === InstrumentStatus.AVAILABLE
      ? "status-pill status-pill-available"
      : "status-pill status-pill-unavailable";
  const serializeReservation = (reservation: (typeof instrument.reservations)[number]) => {
    const startTime = getLabTimeKey(reservation.startAt);
    const endDateKey = getLabDateKey(reservation.endAt);
    const endTimeBase = getLabTimeKey(reservation.endAt);
    const endTime = endDateKey !== getLabDateKey(reservation.startAt) && endTimeBase === "00:00" ? "24:00" : endTimeBase;
    const startSlot = timeKeyToSlot(startTime);
    const endSlot = timeKeyToSlot(endTime);

    return {
      id: reservation.id,
      userId: reservation.userId,
      date: getLabDateKey(reservation.startAt),
      startSlot,
      endSlot,
      isAllDay: startSlot === 0 && endSlot === 36,
      timeRangeLabel: `${formatDateTime(reservation.startAt)} to ${formatDateTime(reservation.endAt)}`,
      startTimeLabel: formatTime(reservation.startAt),
      endTimeLabel: formatTime(reservation.endAt),
      purpose: reservation.purpose,
      user: {
        name: reservation.user.name
      }
    };
  };

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
              <span className={statusClassName}>{statusLabel}</span>
              <span>Owner: {instrument.owner?.name ?? "Unassigned"}</span>
              <span>{instrument.manuals.length} manual(s)</span>
            </div>
          </div>
          {canManageInstrument ? (
            <div className="inline-actions">
              <span className="tag">{user.role === Role.ADMIN ? "Admin or owner controls" : "Owner controls"}</span>
              <form action={deleteInstrumentAction}>
                <input type="hidden" name="instrumentId" value={instrument.id} />
                <ConfirmSubmitButton
                  className="button button-ghost button-small"
                  label="Delete instrument"
                  message={`Delete ${instrument.name}? This cannot be undone. Click OK to confirm or Cancel to keep it.`}
                />
              </form>
            </div>
          ) : (
            <span className="tag">Member booking view</span>
          )}
        </div>

        <p>{instrument.description}</p>
        {instrument.status === InstrumentStatus.UNAVAILABLE && instrument.statusNote ? (
          <p className="muted">
            <strong>Unavailable note:</strong> {instrument.statusNote}
          </p>
        ) : null}
        {notice ? <Notice type={notice.type} message={notice.message} /> : null}
      </section>

      <section className="panel booking-panel" style={{ gridColumn: "1 / -1" }}>
        <div className="section-head">
          <div>
            <h2>Reservation calendar</h2>
            <p className="muted">The calendar now owns the workflow: drag to select time blocks, then submit the reservation inline. The shared week view now includes weekend booking too.</p>
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
          reservations={instrument.reservations.map(serializeReservation)}
          selectedReservationId={reservationId}
          upcomingReservations={upcomingReservations.map(serializeReservation)}
          updateAction={updateReservationAction}
          weekOffset={weekOffset}
          weekDays={weekDays}
        />
      </section>

      <div className="instrument-support-grid" style={{ gridColumn: "1 / -1" }}>
        <div className="instrument-side-stack">
          <section className="panel">
            <div className="section-head">
              <div>
                <h2>Instrument availability</h2>
                <p className="muted">
                  Keep the status current so labmates know whether they can rely on this instrument.
                </p>
              </div>
            </div>

          <div className="meta" style={{ marginBottom: 18 }}>
            <span className={statusClassName}>{statusLabel}</span>
            {instrument.statusNote ? <span>{instrument.statusNote}</span> : null}
          </div>

            {canManageInstrument ? (
              <form action={updateInstrumentStatusAction} className="form-grid">
                <input type="hidden" name="instrumentId" value={instrument.id} />
                <div className="form-grid two-up">
                  <InstrumentStatusFields
                    defaultNote={instrument.statusNote ?? ""}
                    defaultStatus={instrument.status}
                    noteName="statusNote"
                    statusName="status"
                  />
                </div>

                <button className="button button-secondary" type="submit">
                  Update availability
                </button>
              </form>
            ) : instrumentUnowned ? (
              <form action={claimInstrumentOwnershipAction} className="form-grid">
                <input type="hidden" name="instrumentId" value={instrument.id} />
                <button className="button button-secondary" type="submit">
                  Claim ownership
                </button>
              </form>
            ) : (
              <p className="muted">Only the instrument owner or an admin can change availability or delete this record.</p>
            )}
          </section>

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
        </div>

        <section className="panel">
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
    </div>
  );
}
