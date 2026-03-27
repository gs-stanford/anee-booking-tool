"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  addDays,
  formatDateTime,
  formatMonthDay,
  formatShortDay,
  formatTime,
  toDateInputValue
} from "@/lib/utils";

type ReservationItem = {
  id: string;
  userId: string;
  startAt: string;
  endAt: string;
  purpose: string | null;
  user: {
    name: string;
  };
};

type BookingCalendarProps = {
  instrumentId: string;
  reservations: ReservationItem[];
  upcomingReservations: ReservationItem[];
  weekStart: string;
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
const VISIBLE_DAYS = 7;

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function buildWeekLink(instrumentId: string, weekOffset: number, composeDate: string) {
  return `/instruments/${instrumentId}?week=${weekOffset}&composeDate=${composeDate}#booking-editor`;
}

function slotToTime(slotIndex: number) {
  const totalMinutes = START_HOUR * 60 + slotIndex * SLOT_MINUTES;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function selectionSlotToDate(date: string, slotIndex: number) {
  const [year, month, day] = date.split("-").map((value) => Number(value));
  const result = new Date(year, month - 1, day, START_HOUR, 0, 0, 0);
  result.setMinutes(result.getMinutes() + slotIndex * SLOT_MINUTES);
  return result;
}

function reservationToSelection(startAt: Date, endAt: Date): SelectionState {
  const startMinutes = startAt.getHours() * 60 + startAt.getMinutes();
  const endMinutes = endAt.getHours() * 60 + endAt.getMinutes();
  const startSlot = Math.max(0, Math.floor((startMinutes - START_HOUR * 60) / SLOT_MINUTES));
  const endSlot = Math.max(
    startSlot + 1,
    Math.min(TOTAL_SLOTS, Math.ceil((endMinutes - START_HOUR * 60) / SLOT_MINUTES))
  );

  return {
    date: toDateInputValue(startAt),
    startSlot,
    endSlot
  };
}

function defaultSelection(composeDate: string): SelectionState {
  return {
    date: composeDate,
    startSlot: DEFAULT_START_SLOT,
    endSlot: DEFAULT_END_SLOT
  };
}

export function BookingCalendar({
  instrumentId,
  reservations,
  upcomingReservations,
  weekStart,
  weekOffset,
  composeDate,
  selectedReservationId,
  currentUserId,
  isAdmin,
  createAction,
  updateAction,
  cancelAction
}: BookingCalendarProps) {
  const parsedReservations = reservations.map((reservation) => ({
    ...reservation,
    startAtDate: new Date(reservation.startAt),
    endAtDate: new Date(reservation.endAt)
  }));
  const parsedUpcomingReservations = upcomingReservations.map((reservation) => ({
    ...reservation,
    startAtDate: new Date(reservation.startAt),
    endAtDate: new Date(reservation.endAt)
  }));

  const days = Array.from({ length: VISIBLE_DAYS }, (_, index) => addDays(new Date(weekStart), index));
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index);
  const weekEnd = addDays(new Date(weekStart), VISIBLE_DAYS - 1);
  const initialReservation =
    parsedReservations.find((reservation) => reservation.id === selectedReservationId) ??
    parsedUpcomingReservations.find((reservation) => reservation.id === selectedReservationId) ??
    null;

  const [activeReservationId, setActiveReservationId] = useState(initialReservation?.id ?? "");
  const [selection, setSelection] = useState<SelectionState>(
    initialReservation
      ? reservationToSelection(initialReservation.startAtDate, initialReservation.endAtDate)
      : defaultSelection(composeDate)
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
    parsedReservations.find((reservation) => reservation.id === activeReservationId) ??
    parsedUpcomingReservations.find((reservation) => reservation.id === activeReservationId) ??
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
      parsedReservations.find((entry) => entry.id === reservationId) ??
      parsedUpcomingReservations.find((entry) => entry.id === reservationId);

    if (!reservation) {
      return;
    }

    setActiveReservationId(reservation.id);
    setSelection(reservationToSelection(reservation.startAtDate, reservation.endAtDate));
    setPurpose(reservation.purpose ?? "");
    setSelectionSource("reservation");
  }

  function handleNewReservation() {
    setActiveReservationId("");
    setSelection(defaultSelection(selection.date));
    setPurpose("");
    setSelectionSource("grid");
  }

  const selectionStartDate = selectionSlotToDate(selection.date, selection.startSlot);
  const selectionEndDate = selectionSlotToDate(selection.date, selection.endSlot);
  const canSubmit = selectionSource === "grid" || activeReservationEditable;
  const returnTo = activeReservationEditable && activeReservation
    ? `/instruments/${instrumentId}?week=${weekOffset}&composeDate=${selection.date}&reservationId=${activeReservation.id}`
    : `/instruments/${instrumentId}?week=${weekOffset}&composeDate=${selection.date}`;

  return (
    <div className="week-calendar">
      <div className="calendar-toolbar">
        <div>
          <p className="calendar-eyebrow">Shared reservation view</p>
          <h3>
            {formatMonthDay(new Date(weekStart))} to {formatMonthDay(weekEnd)}
          </h3>
        </div>

        <div className="inline-actions">
          <Link className="button button-ghost" href={buildWeekLink(instrumentId, weekOffset - 1, selection.date)}>
            Previous week
          </Link>
          <Link className="button button-secondary" href={buildWeekLink(instrumentId, 0, toDateInputValue(new Date()))}>
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
          {hours.map((hour) => (
            <div className="calendar-time-label" key={hour}>
              {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayReservations = parsedReservations.filter((reservation) => {
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);
            return reservation.startAtDate >= dayStart && reservation.startAtDate <= dayEnd;
          });

          const dayLabel = toDateInputValue(day);
          const isComposeDay = selection.date === dayLabel;
          const hasSelection = isComposeDay;
          const selectionTop = selection.startSlot * SLOT_HEIGHT;
          const selectionHeight = Math.max((selection.endSlot - selection.startSlot) * SLOT_HEIGHT, SLOT_HEIGHT);

          return (
            <section className="calendar-day-column" key={day.toISOString()}>
              <button
                className={`calendar-day-header${isComposeDay ? " calendar-day-header-active" : ""}`}
                onClick={() => setSelection(defaultSelection(dayLabel))}
                type="button"
              >
                <span>{formatShortDay(day)}</span>
                <strong>{formatMonthDay(day)}</strong>
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
                    key={`${day.toISOString()}-${hour}`}
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
                  const startMinutes = reservation.startAtDate.getHours() * 60 + reservation.startAtDate.getMinutes();
                  const endMinutes = reservation.endAtDate.getHours() * 60 + reservation.endAtDate.getMinutes();
                  const visibleStart = Math.max(startMinutes, START_HOUR * 60);
                  const visibleEnd = Math.min(endMinutes, END_HOUR * 60);
                  const top = ((visibleStart - START_HOUR * 60) / SLOT_MINUTES) * SLOT_HEIGHT;
                  const height = Math.max(((visibleEnd - visibleStart) / SLOT_MINUTES) * SLOT_HEIGHT, SLOT_HEIGHT);
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
                        {formatTime(reservation.startAtDate)} to {formatTime(reservation.endAtDate)}
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
              {formatDateTime(selectionStartDate)} to {formatTime(selectionEndDate)}
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
            {parsedUpcomingReservations.length === 0 ? (
              <p className="muted">No reservations scheduled yet.</p>
            ) : (
              parsedUpcomingReservations.map((reservation) => (
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
                    <span>{formatDateTime(reservation.startAtDate)}</span>
                    <span>{formatTime(reservation.endAtDate)}</span>
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
