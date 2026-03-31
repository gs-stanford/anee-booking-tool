"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type ReservationItem = {
  id: string;
  userId: string;
  date: string;
  startSlot: number;
  endSlot: number;
  startTimeLabel: string;
  endTimeLabel: string;
  timeRangeLabel: string;
  purpose: string | null;
  user: {
    name: string;
  };
};

type WeekDay = {
  date: string;
  shortDay: string;
  monthDay: string;
};

type BookingCalendarProps = {
  instrumentId: string;
  reservations: ReservationItem[];
  upcomingReservations: ReservationItem[];
  weekDays: WeekDay[];
  weekOffset: number;
  composeDate: string;
  selectedReservationId?: string;
  currentUserId: string;
  isAdmin: boolean;
  createAction: (formData: FormData) => void | Promise<void>;
  updateAction: (formData: FormData) => void | Promise<void>;
  cancelAction: (formData: FormData) => void | Promise<void>;
};

type SelectionState = {
  date: string;
  startSlot: number;
  endSlot: number;
};

const START_HOUR = 6;
const END_HOUR = 24;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 44;
const PIXELS_PER_HOUR = SLOT_HEIGHT * 2;
const DEFAULT_START_SLOT = 4;
const DEFAULT_END_SLOT = 6;
const TOTAL_SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;

function buildWeekLink(instrumentId: string, weekOffset: number, composeDate: string) {
  return `/instruments/${instrumentId}?week=${weekOffset}&composeDate=${composeDate}#booking-editor`;
}

function slotToTime(slotIndex: number) {
  const totalMinutes = START_HOUR * 60 + slotIndex * SLOT_MINUTES;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDateKey(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatTimeLabel(time: string) {
  const [hoursRaw, minutes] = time.split(":").map((value) => Number(value));
  const hours = hoursRaw % 24;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function formatSelectionDateTime(date: string, slotIndex: number) {
  return `${formatDateKey(date)}, ${formatTimeLabel(slotToTime(slotIndex))}`;
}

function reservationToSelection(reservation: ReservationItem): SelectionState {
  return {
    date: reservation.date,
    startSlot: reservation.startSlot,
    endSlot: reservation.endSlot
  };
}

function defaultSelection(composeDate: string): SelectionState {
  return {
    date: composeDate,
    startSlot: DEFAULT_START_SLOT,
    endSlot: DEFAULT_END_SLOT
  };
}

function fullDaySelection(date: string): SelectionState {
  return {
    date,
    startSlot: 0,
    endSlot: TOTAL_SLOTS
  };
}

export function BookingCalendar({
  instrumentId,
  reservations,
  upcomingReservations,
  weekDays,
  weekOffset,
  composeDate,
  selectedReservationId,
  currentUserId,
  isAdmin,
  createAction,
  updateAction,
  cancelAction
}: BookingCalendarProps) {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index);
  const initialReservation =
    reservations.find((reservation) => reservation.id === selectedReservationId) ??
    upcomingReservations.find((reservation) => reservation.id === selectedReservationId) ??
    null;

  const [activeReservationId, setActiveReservationId] = useState(initialReservation?.id ?? "");
  const [selection, setSelection] = useState<SelectionState>(
    initialReservation ? reservationToSelection(initialReservation) : defaultSelection(composeDate)
  );
  const [purpose, setPurpose] = useState(initialReservation?.purpose ?? "");
  const [selectionSource, setSelectionSource] = useState<"grid" | "reservation">(initialReservation ? "reservation" : "grid");
  const selectionAnchor = useRef<{ date: string; slotIndex: number } | null>(null);
  const [pointerSelecting, setPointerSelecting] = useState(false);

  useEffect(() => {
    function handlePointerUp() {
      setPointerSelecting(false);
      selectionAnchor.current = null;
    }

    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, []);

  const activeReservation =
    reservations.find((reservation) => reservation.id === activeReservationId) ??
    upcomingReservations.find((reservation) => reservation.id === activeReservationId) ??
    null;
  const activeReservationEditable = Boolean(
    activeReservation && (activeReservation.userId === currentUserId || isAdmin)
  );

  function updateSelectionFromSlot(date: string, slotIndex: number) {
    const anchor = selectionAnchor.current;

    if (!anchor || anchor.date !== date) {
      setSelection({
        date,
        startSlot: slotIndex,
        endSlot: slotIndex + 1
      });
      return;
    }

    const startSlot = Math.min(anchor.slotIndex, slotIndex);
    const endSlot = Math.max(anchor.slotIndex, slotIndex) + 1;

    setSelection({
      date,
      startSlot,
      endSlot
    });
  }

  function handleSlotPointerDown(date: string, slotIndex: number) {
    selectionAnchor.current = { date, slotIndex };
    setPointerSelecting(true);
    setSelectionSource("grid");
    setActiveReservationId("");
    setPurpose("");

    updateSelectionFromSlot(date, slotIndex);
  }

  function handleSlotPointerEnter(date: string, slotIndex: number) {
    if (!pointerSelecting) {
      return;
    }

    updateSelectionFromSlot(date, slotIndex);
  }

  function handleReservationSelect(reservationId: string) {
    const reservation =
      reservations.find((entry) => entry.id === reservationId) ??
      upcomingReservations.find((entry) => entry.id === reservationId);

    if (!reservation) {
      return;
    }

    setActiveReservationId(reservation.id);
    setSelection(reservationToSelection(reservation));
    setPurpose(reservation.purpose ?? "");
    setSelectionSource("reservation");
  }

  function handleNewReservation() {
    setActiveReservationId("");
    setSelection(defaultSelection(selection.date));
    setPurpose("");
    setSelectionSource("grid");
  }

  function handleAllDaySelect(date: string) {
    setActiveReservationId("");
    setPurpose("");
    setSelection(fullDaySelection(date));
    setSelectionSource("grid");
  }

  const canSubmit = selectionSource === "grid" || activeReservationEditable;
  const isAllDaySelection = selection.startSlot === 0 && selection.endSlot === TOTAL_SLOTS;
  const returnTo = activeReservationEditable && activeReservation
    ? `/instruments/${instrumentId}?week=${weekOffset}&composeDate=${selection.date}&reservationId=${activeReservation.id}`
    : `/instruments/${instrumentId}?week=${weekOffset}&composeDate=${selection.date}`;

  return (
    <div className="week-calendar">
      <div className="calendar-toolbar">
        <div>
          <p className="calendar-eyebrow">Shared reservation view</p>
          <h3>
            {weekDays[0]?.monthDay} to {weekDays[weekDays.length - 1]?.monthDay}
          </h3>
        </div>

        <div className="inline-actions">
          <Link className="button button-ghost" href={buildWeekLink(instrumentId, weekOffset - 1, selection.date)}>
            Previous week
          </Link>
          <Link className="button button-secondary" href={buildWeekLink(instrumentId, 0, composeDate)}>
            This week
          </Link>
          <Link className="button button-ghost" href={buildWeekLink(instrumentId, weekOffset + 1, selection.date)}>
            Next week
          </Link>
        </div>
      </div>

      <div className="calendar-board">
        <div className="calendar-time-column">
          <div className="calendar-corner" />
          <div className="calendar-all-day-spacer" />
          {hours.map((hour) => (
            <div className="calendar-time-label" key={hour}>
              {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </div>
          ))}
        </div>

        {weekDays.map((day) => {
          const dayReservations = reservations.filter((reservation) => reservation.date === day.date);
          const dayLabel = day.date;
          const isComposeDay = selection.date === dayLabel;
          const hasSelection = isComposeDay;
          const selectionTop = selection.startSlot * SLOT_HEIGHT;
          const selectionHeight = Math.max((selection.endSlot - selection.startSlot) * SLOT_HEIGHT, SLOT_HEIGHT);

          return (
            <section className="calendar-day-column" key={day.date}>
              <button
                className={`calendar-day-header${isComposeDay ? " calendar-day-header-active" : ""}`}
                onClick={() => setSelection(defaultSelection(dayLabel))}
                type="button"
              >
                <span>{day.shortDay}</span>
                <strong>{day.monthDay}</strong>
              </button>

              <button
                className={`calendar-all-day-button${selection.date === dayLabel && isAllDaySelection ? " calendar-all-day-button-active" : ""}`}
                onClick={() => handleAllDaySelect(dayLabel)}
                type="button"
              >
                All day
              </button>

              <div className="calendar-day-surface" style={{ height: `${TOTAL_SLOTS * SLOT_HEIGHT}px` }}>
                <div className="calendar-slot-grid">
                  {Array.from({ length: TOTAL_SLOTS }, (_, slotIndex) => (
                    <button
                      aria-label={`Select ${dayLabel} ${slotToTime(slotIndex)}`}
                      className="calendar-slot-button"
                      key={`${dayLabel}-${slotIndex}`}
                      onPointerDown={() => handleSlotPointerDown(dayLabel, slotIndex)}
                      onPointerEnter={() => handleSlotPointerEnter(dayLabel, slotIndex)}
                      type="button"
                    />
                  ))}
                </div>

                {hours.map((hour) => (
                  <div
                    className="calendar-hour-line"
                    key={`${day.date}-${hour}`}
                    style={{ top: `${(hour - START_HOUR) * PIXELS_PER_HOUR}px` }}
                  />
                ))}

                {hasSelection ? (
                  <div
                    className="calendar-selection"
                    style={{ top: `${selectionTop}px`, height: `${selectionHeight}px` }}
                  />
                ) : null}

                {dayReservations.map((reservation) => {
                  const top = reservation.startSlot * SLOT_HEIGHT;
                  const height = Math.max((reservation.endSlot - reservation.startSlot) * SLOT_HEIGHT, SLOT_HEIGHT);
                  const isSelected = activeReservationId === reservation.id;
                  const isOwned = reservation.userId === currentUserId || isAdmin;

                  return (
                    <button
                      className={`calendar-event${isSelected ? " calendar-event-selected" : ""}${isOwned ? " calendar-event-owned" : ""}${!isOwned ? " calendar-event-readonly" : ""}`}
                      key={reservation.id}
                      onClick={() => handleReservationSelect(reservation.id)}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      type="button"
                    >
                      <strong>{reservation.user.name}</strong>
                      <span>
                        {reservation.startTimeLabel} to {reservation.endTimeLabel}
                      </span>
                      {reservation.purpose ? <p>{reservation.purpose}</p> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="booking-bottom-grid">
        <form
          action={activeReservationEditable ? updateAction : createAction}
          className="booking-editor-card"
          id="booking-editor"
        >
          <input name="returnTo" type="hidden" value={returnTo} />
          <input name="instrumentId" type="hidden" value={instrumentId} />
          <input name="date" type="hidden" value={selection.date} />
          <input name="startTime" type="hidden" value={slotToTime(selection.startSlot)} />
          <input name="endTime" type="hidden" value={slotToTime(selection.endSlot)} />
          {activeReservationEditable && activeReservation ? (
            <input name="reservationId" type="hidden" value={activeReservation.id} />
          ) : null}

          <div className="section-head">
            <div>
              <h3>{activeReservationEditable ? "Edit reservation" : "New reservation"}</h3>
              <p className="muted">
                Drag directly on the calendar to choose the block. No manual time entry needed.
              </p>
            </div>
            {activeReservationId ? (
              <button className="button button-ghost button-small" onClick={handleNewReservation} type="button">
                Start fresh
              </button>
            ) : null}
          </div>

          <div className="selection-summary">
            <span className="tag">
              {activeReservationEditable ? "Editing existing booking" : selectionSource === "reservation" ? "Viewing booking" : "Selected block"}
            </span>
            <h4>
              {formatSelectionDateTime(selection.date, selection.startSlot)} to {formatTimeLabel(slotToTime(selection.endSlot))}
            </h4>
            <p className="muted">
              {selectionSource === "reservation" && !activeReservationEditable
                ? "This booking belongs to another lab member. Select an open block to create your own reservation."
                : "Click once for a 30-minute block or drag vertically for longer reservations."}
            </p>
          </div>

          <div className="field">
            <label htmlFor="purpose">Purpose</label>
            <input
              id="purpose"
              name="purpose"
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="Imaging session"
              value={purpose}
            />
          </div>

          <div className="inline-actions">
            <button className="button button-primary" disabled={!canSubmit} type="submit">
              {activeReservationEditable ? "Save reservation" : "Reserve instrument"}
            </button>
            {activeReservationEditable ? (
              <button className="button button-ghost" formAction={cancelAction} type="submit">
                Cancel reservation
              </button>
            ) : null}
          </div>
        </form>

        <section className="booking-feed">
          <div className="section-head">
            <div>
              <h3>Upcoming reservations</h3>
              <p className="muted">Select any booking to inspect it or edit your own.</p>
            </div>
          </div>

          <div className="list">
            {upcomingReservations.length === 0 ? (
              <p className="muted">No reservations scheduled yet.</p>
            ) : (
              upcomingReservations.map((reservation) => (
                <button
                  className={`reservation-row reservation-row-button${activeReservationId === reservation.id ? " reservation-row-selected" : ""}`}
                  key={reservation.id}
                  onClick={() => handleReservationSelect(reservation.id)}
                  type="button"
                >
                  <div className="section-head">
                    <strong>{reservation.user.name}</strong>
                    <span className="tag">
                      {reservation.userId === currentUserId || isAdmin ? "Editable" : "Occupied"}
                    </span>
                  </div>
                  <div className="meta">
                    <span>{reservation.timeRangeLabel}</span>
                  </div>
                  {reservation.purpose ? <p>{reservation.purpose}</p> : null}
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
