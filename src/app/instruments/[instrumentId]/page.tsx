import { isAllDayReservation } from "@/lib/reservation-calendar";
import { InstrumentSharingFields } from "@/components/instrument-sharing-fields";
import Link from "next/link";
import { InstrumentStatus, Role } from "@prisma/client";
import { notFound } from "next/navigation";

import {
  cancelReservationAction,
  claimInstrumentOwnershipAction,
  createReservationAction,
  deleteInstrumentAction,
  deleteManualAction,
  updateInstrumentDetailsAction,
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
import { getUnavailableDateRange, isInstrumentUnavailableOnDate } from "@/lib/instrument-availability";
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
  getSingleParam,
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
  const { instrumentId } = await params;
  const user = await requireUser(`/instruments/${instrumentId}`);
  const resolvedSearchParams = await searchParams;
  const isTempUser = user.role === Role.TEMP;

  const weekParam = getSingleParam(resolvedSearchParams, "week");
  const reservationId = getSingleParam(resolvedSearchParams, "reservationId");
  const parsedWeekOffset = Number(weekParam ?? "0");
  const weekOffset = Number.isInteger(parsedWeekOffset) ? Math.max(Math.min(parsedWeekOffset, 156), -156) : 0;
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

  if (isTempUser && !instrument.temporaryAccessEnabled) {
    const notice = getNotice(resolvedSearchParams);

    return (
      <section className="panel">
        <div className="section-head">
          <div>
            <Link href="/instruments" className="muted">
              Back to calendar
            </Link>
            <h1>Instrument not approved for temporary booking</h1>
            <p className="muted">
              This temporary account can only reserve instruments explicitly enabled by the lab admin or instrument
              owner.
            </p>
          </div>
        </div>
        {notice ? <Notice type={notice.type} message={notice.message} /> : null}
        <div className="inline-actions">
          <Link className="button button-primary" href="/instruments">
            Open approved calendar
          </Link>
          <Link className="button button-secondary" href="/safety">
            Open safety tools
          </Link>
        </div>
      </section>
    );
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
  const canManageInstrument = !isTempUser && (user.role === Role.ADMIN || instrument.ownerId === user.id);
  const unavailableRange = getUnavailableDateRange(instrument, todayDateKey);
  const instrumentCurrentlyUnavailable = isInstrumentUnavailableOnDate(instrument, todayDateKey, todayDateKey);
  const scheduledUnavailableFuture =
    unavailableRange !== null && unavailableRange.startDateKey > todayDateKey;
  const statusLabel = instrument.status === InstrumentStatus.AVAILABLE ? "Available" : "Unavailable";
  const statusClassName =
    instrument.status === InstrumentStatus.AVAILABLE
      ? "status-pill status-pill-available"
      : "status-pill status-pill-unavailable";
  const unavailableUntilDateKey = instrument.unavailableUntil ? getLabDateKey(instrument.unavailableUntil) : null;
  const unavailabilityReviewDue =
    instrument.status === InstrumentStatus.UNAVAILABLE && unavailableUntilDateKey !== null && unavailableUntilDateKey <= todayDateKey;
  const bookingDisabledMessage = instrument.owner?.email
    ? `Instrument unavailable. Please contact ${instrument.owner.name} at ${instrument.owner.email}.`
    : instrument.owner?.name
      ? `Instrument unavailable. Please contact ${instrument.owner.name}.`
      : "Instrument unavailable. Please contact the instrument owner.";
  const unavailableWeekReservations = weekDays
    .filter((day) => isInstrumentUnavailableOnDate(instrument, day.date, todayDateKey))
    .map((day) => ({
      id: `unavailable-${instrument.id}-${day.date}`,
      userId: null,
      date: day.date,
      startSlot: 0,
      endSlot: 48,
      isAllDay: true,
      startTimeLabel: "All day",
      endTimeLabel: "All day",
      timeRangeLabel: `${formatDate(day.date ? new Date(`${day.date}T12:00:00Z`) : new Date())} (All day)`,
      purpose: instrument.statusNote ?? null,
      kind: "unavailability" as const,
      user: {
        name: "Unavailable"
      }
    }));
  const serializeReservation = (reservation: (typeof instrument.reservations)[number], date = getLabDateKey(reservation.startAt)) => {
    const dayStart = parseLabDateTime(date, "00:00");
    const dayEnd = parseLabDateTime(shiftDateString(date, 1), "00:00");
    const startSlot = reservation.startAt < dayStart ? 0 : timeKeyToSlot(getLabTimeKey(reservation.startAt), 0);
    const endSlot = reservation.endAt >= dayEnd ? 48 : timeKeyToSlot(getLabTimeKey(reservation.endAt), 0);
    return {
      id: reservation.id,
      userId: reservation.userId,
      date,
      originalDate: getLabDateKey(reservation.startAt),
      originalEndDate: getLabDateKey(reservation.endAt),
      originalStartTime: getLabTimeKey(reservation.startAt),
      originalEndTime: getLabTimeKey(reservation.endAt),
      startSlot,
      endSlot,
      isAllDay: isAllDayReservation(reservation),
      timeRangeLabel: `${formatDateTime(reservation.startAt)} to ${formatDateTime(reservation.endAt)}`,
      startTimeLabel: formatTime(reservation.startAt),
      endTimeLabel: formatTime(reservation.endAt),
      purpose: reservation.purpose,
      kind: "reservation" as const,
      user: {
        name: reservation.user.name
      }
    };
  };
  const renderManualPanel = (allowManualManagement: boolean) => (
    <section className="panel manuals-panel">
      <div className="section-head">
        <div>
          <h2>Manuals</h2>
          <p className="muted">
            {allowManualManagement
              ? "Store instrument manuals as downloadable files tied directly to this instrument."
              : "Download instrument manuals shared by the lab."}
          </p>
        </div>
      </div>

      <div className="list" style={{ marginBottom: allowManualManagement ? 18 : 0 }}>
        {instrument.manuals.length === 0 ? (
          <p className="muted">No manual uploaded yet.</p>
        ) : (
          instrument.manuals.map((manual) => (
            <div className="sheet-row" key={manual.id}>
              <div className="section-head">
                <a href={`/api/manuals/${manual.id}`}>
                  <h4>{manual.originalName}</h4>
                </a>
                {allowManualManagement ? (
                  <form action={deleteManualAction}>
                    <input type="hidden" name="instrumentId" value={instrument.id} />
                    <input type="hidden" name="manualId" value={manual.id} />
                    <button className="button button-ghost button-small" type="submit">
                      Remove file
                    </button>
                  </form>
                ) : null}
              </div>
              <div className="meta">
                <span>Uploaded {formatDateTime(manual.uploadedAt)}</span>
                <a href={`/api/manuals/${manual.id}`}>Download</a>
              </div>
            </div>
          ))
        )}
      </div>

      {allowManualManagement ? (
        <form action={uploadManualAction} className="form-grid">
          <input type="hidden" name="instrumentId" value={instrument.id} />
          <div className="field">
            <label htmlFor="manual">Upload manual</label>
            <input id="manual" name="manual" type="file" accept=".pdf,.doc,.docx" required />
            <span className="field-hint">PDF, DOC, or DOCX files up to 45 MB.</span>
          </div>
          <button className="button button-secondary" type="submit">
            Save manual
          </button>
        </form>
      ) : null}
    </section>
  );

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
              {instrument.owner?.email ? <span>{instrument.owner.email}</span> : null}
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
            <span className="tag">{isTempUser ? "Calendar" : "Member booking view"}</span>
          )}
        </div>

        {!isTempUser ? <Link className="button button-secondary button-small" href={`/instruments/labels?instrumentId=${instrument.id}`}>Print QR label</Link> : null}
        <p>{instrument.description}</p>
        {instrument.status === InstrumentStatus.UNAVAILABLE && instrument.statusNote ? (
          <p className="muted">
            <strong>Unavailable note:</strong> {instrument.statusNote}
          </p>
        ) : null}
        {instrument.status === InstrumentStatus.UNAVAILABLE && instrument.unavailableFrom ? (
          <p className="muted">
            <strong>Unavailable from:</strong> {formatDate(instrument.unavailableFrom)}
          </p>
        ) : null}
        {instrument.status === InstrumentStatus.UNAVAILABLE && instrument.unavailableUntil ? (
          <p className="muted">
            <strong>Unavailable until:</strong> {formatDate(instrument.unavailableUntil)}
          </p>
        ) : null}
        {instrumentCurrentlyUnavailable ? (
          <div className="notice notice-error">
            {bookingDisabledMessage}
            {instrument.owner?.email ? (
              <>
                {" "}
                <a href={`mailto:${instrument.owner.email}`}>Email owner</a>.
              </>
            ) : null}
          </div>
        ) : null}
        {scheduledUnavailableFuture ? (
          <div className="notice notice-error">
            Scheduled unavailable window starts {formatDate(instrument.unavailableFrom!)}. Booking is still allowed
            before that date.
          </div>
        ) : null}
        {unavailabilityReviewDue && canManageInstrument ? (
          <div className="notice notice-error">
            Unavailability review date reached. Please confirm the instrument is back or extend the unavailable-until
            date.
          </div>
        ) : null}
        {notice ? <Notice type={notice.type} message={notice.message} /> : null}
      </section>

      <section className="panel booking-panel" style={{ gridColumn: "1 / -1" }}>
        <div className="section-head">
          <div>
            <h2>Reservation calendar</h2>
            <p className="muted">
              {isTempUser
                ? "Drag to select an approved booking block, then submit the reservation inline."
                : "The calendar now owns the workflow: drag to select time blocks, then submit the reservation inline. The shared week view now includes weekend booking too."}
            </p>
          </div>
        </div>

        {isTempUser && user.calendarAccessOnHold ? (
          <div className="notice notice-error">
            Calendar booking is on hold until SDS review and glovebox walkthrough are approved by an admin. Manuals
            remain available below.
          </div>
        ) : (
          <BookingCalendar
            cancelAction={cancelReservationAction}
            composeDate={composeDate}
            createAction={createReservationAction}
            currentUserId={user.id}
            instrumentId={instrument.id}
            isAdmin={user.role === Role.ADMIN}
            key={`${weekOffset}-${composeDate}-${reservationId ?? "new"}`}
            reservations={[...unavailableWeekReservations, ...instrument.reservations.flatMap(reservation => weekDays.filter(day => reservation.startAt < parseLabDateTime(shiftDateString(day.date, 1), "00:00") && reservation.endAt > parseLabDateTime(day.date, "00:00")).map(day => serializeReservation(reservation, day.date)))]}
            selectedReservationId={reservationId}
            unavailableMessage={bookingDisabledMessage}
            upcomingReservations={upcomingReservations.map(reservation => serializeReservation(reservation))}
            updateAction={updateReservationAction}
            weekOffset={weekOffset}
            weekDays={weekDays}
          />
        )}
      </section>

      {isTempUser ? (
        <div style={{ gridColumn: "1 / -1" }}>{renderManualPanel(false)}</div>
      ) : null}

      {!isTempUser ? (
        <div className="instrument-support-grid" style={{ gridColumn: "1 / -1" }}>
          <div className="instrument-side-stack">
            <section className="panel">
              <div className="section-head">
                <div>
                  <h2>Instrument details</h2>
                  <p className="muted">Owners can update the name, location, and description after creation.</p>
                </div>
              </div>

              {canManageInstrument ? (
                <form action={updateInstrumentDetailsAction} className="form-grid">
                  <input type="hidden" name="instrumentId" value={instrument.id} />
                  <input type="hidden" name="returnTo" value={`/instruments/${instrument.id}`} />
                  <div className="form-grid two-up">
                    <div className="field">
                      <label htmlFor="instrument-name">Instrument name</label>
                      <input id="instrument-name" name="name" defaultValue={instrument.name} required />
                    </div>
                    <div className="field">
                      <label htmlFor="instrument-location">Location</label>
                      <input id="instrument-location" name="location" defaultValue={instrument.location} required />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="instrument-description">Description and usage notes</label>
                    <textarea id="instrument-description" name="description" defaultValue={instrument.description} required />
                  </div>
                  <InstrumentSharingFields impactCategory={instrument.impactCategory} crossShared={instrument.crossShared} />
                  <input type="hidden" name="temporaryAccessEnabled" value={instrument.temporaryAccessEnabled ? "on" : ""} />
                  <button className="button button-secondary" type="submit">
                    Save details
                  </button>
                </form>
              ) : (
                <p className="muted">Only the instrument owner or an admin can edit these details.</p>
              )}
            </section>

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
                {instrument.unavailableFrom ? <span>From {formatDate(instrument.unavailableFrom)}</span> : null}
                {instrument.unavailableUntil ? <span>Until {formatDate(instrument.unavailableUntil)}</span> : null}
              </div>

              {canManageInstrument ? (
                <form action={updateInstrumentStatusAction} className="form-grid">
                  <input type="hidden" name="instrumentId" value={instrument.id} />
                  <div className="form-grid two-up">
                    <InstrumentStatusFields
                      defaultNote={instrument.statusNote ?? ""}
                      defaultUnavailableFrom={instrument.unavailableFrom ? toDateInputValue(instrument.unavailableFrom) : ""}
                      defaultStatus={instrument.status}
                      defaultUnavailableUntil={instrument.unavailableUntil ? toDateInputValue(instrument.unavailableUntil) : ""}
                      noteName="statusNote"
                      statusName="status"
                      unavailableFromName="unavailableFrom"
                      unavailableUntilName="unavailableUntil"
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

            {renderManualPanel(true)}
          </div>


        </div>
      ) : null}
    </div>
  );
}
