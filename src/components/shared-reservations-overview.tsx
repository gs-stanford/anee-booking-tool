"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ReservationSummary } from "@/lib/reservation-summary";
import type { ReservationCalendarItem } from "@/lib/reservation-calendar";

type SharedReservationsOverviewProps = {
  summaries: ReservationSummary[];
  calendarItems: ReservationCalendarItem[];
  emptyMessage?: string;
  defaultView?: "list" | "calendar";
  calendarHref?: string;
};

type OverviewView = "list" | "calendar";

const INSTRUMENT_COLORS = [
  { background: "#eef5c9", border: "#c7d76f", text: "#536416" },
  { background: "#e7eefc", border: "#96b1ef", text: "#28498f" },
  { background: "#efe7fc", border: "#b89ce8", text: "#5f338f" },
  { background: "#fdeacc", border: "#e6b564", text: "#8a5315" },
  { background: "#e3f5f2", border: "#76cab8", text: "#1d6f61" },
  { background: "#f9e0e7", border: "#df90a6", text: "#8e2f4b" }
];
const MONTH_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getInstrumentColor(instrumentId: string) {
  const hash = instrumentId.split("").reduce((total, character) => total + character.charCodeAt(0), 0);
  return INSTRUMENT_COLORS[hash % INSTRUMENT_COLORS.length];
}

function getMonthStart(offset: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1, 12));
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDate(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatMonthHeading(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function buildMonthGrid(monthStart: Date) {
  const month = monthStart.getUTCMonth();
  const firstWeekday = (monthStart.getUTCDay() + 6) % 7;
  const gridStart = shiftDate(monthStart, -firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = shiftDate(gridStart, index);
    return {
      key: toDateKey(date),
      dayNumber: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month
    };
  });
}

export function SharedReservationsOverview({
  summaries,
  calendarItems,
  emptyMessage = "No reservations scheduled yet.",
  defaultView = "list",
  calendarHref
}: SharedReservationsOverviewProps) {
  const [view, setView] = useState<OverviewView>(defaultView);
  const [monthOffset, setMonthOffset] = useState(0);
  const monthStart = getMonthStart(monthOffset);
  const monthKeyPrefix = toDateKey(monthStart).slice(0, 7);
  const viewOrder: OverviewView[] = defaultView === "calendar" ? ["calendar", "list"] : ["list", "calendar"];

  const reservationsByDay = useMemo(() => {
    return calendarItems.reduce<Record<string, ReservationCalendarItem[]>>((map, reservation) => {
      if (!map[reservation.date]) {
        map[reservation.date] = [];
      }

      map[reservation.date].push(reservation);
      return map;
    }, {});
  }, [calendarItems]);

  const visibleGrid = buildMonthGrid(monthStart);
  const visibleCount = calendarItems.filter((reservation) => reservation.date.startsWith(monthKeyPrefix)).length;

  return (
    <div className="shared-reservations-overview">
      <div className="shared-reservations-toolbar">
        <div className="inline-actions">
          {viewOrder.map((viewOption) => {
            if (viewOption === "calendar" && calendarHref) {
              return (
                <Link className="button button-small button-ghost" href={calendarHref} key="calendar-link">
                  Calendar
                </Link>
              );
            }

            return (
              <button
                className={`button button-small ${view === viewOption ? "button-secondary" : "button-ghost"}`}
                onClick={() => setView(viewOption)}
                key={viewOption}
                type="button"
              >
                {viewOption === "calendar" ? "Calendar" : "List"}
              </button>
            );
          })}
        </div>

        {view === "calendar" ? (
          <div className="inline-actions">
            <button
              className="button button-small button-ghost"
              disabled={monthOffset <= 0}
              onClick={() => setMonthOffset((currentOffset) => Math.max(0, currentOffset - 1))}
              type="button"
            >
              Previous month
            </button>
            <button
              className="button button-small button-ghost"
              onClick={() => setMonthOffset((currentOffset) => currentOffset + 1)}
              type="button"
            >
              Next month
            </button>
          </div>
        ) : null}
      </div>

      {view === "list" ? (
        <div className="list">
          {summaries.length === 0 ? (
            <p className="muted">{emptyMessage}</p>
          ) : (
            summaries.map((reservation) => (
              <div className="reservation-row" key={reservation.id}>
                <strong>{reservation.instrumentName}</strong>
                <div className="meta">
                  <span>{reservation.userName}</span>
                  <span>{reservation.label}</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="shared-month-calendar">
        <div className="section-head" style={{ marginBottom: 14 }}>
            <div>
              <h3>{formatMonthHeading(monthStart)}</h3>
              <p className="muted">
                {visibleCount === 0 ? "No bookings in this month yet." : `${visibleCount} booking${visibleCount === 1 ? "" : "s"} shown.`}
              </p>
            </div>
          </div>

          <div className="month-calendar-shell">
            <div className="month-calendar-weekdays">
              {MONTH_WEEKDAYS.map((weekday) => (
                <div className="month-calendar-weekday" key={weekday}>
                  {weekday}
                </div>
              ))}
            </div>

            <div className="month-calendar-grid">
              {visibleGrid.map((day) => {
                const reservations = reservationsByDay[day.key] ?? [];
                const allDayReservations = reservations.filter((reservation) => reservation.isAllDay);
                const timedReservations = reservations.filter((reservation) => !reservation.isAllDay);

                return (
                  <div className={`month-calendar-cell${day.inMonth ? "" : " month-calendar-cell-muted"}`} key={day.key}>
                    <div className="month-calendar-day-number">{day.dayNumber}</div>

                    <div className="month-calendar-all-day-stack">
                      {allDayReservations.map((reservation) => {
                        const color = getInstrumentColor(reservation.instrumentId);

                        return (
                          <div
                            className="month-calendar-chip month-calendar-chip-all-day"
                            key={reservation.id}
                            style={{
                              background: color.background,
                              borderColor: color.border,
                              color: color.text
                            }}
                            title={`${reservation.instrumentName} • ${reservation.userName} (All day)`}
                          >
                            {reservation.instrumentName} • {reservation.userName}
                          </div>
                        );
                      })}
                    </div>

                    <div className="month-calendar-booking-stack">
                      {timedReservations.map((reservation) => {
                        const color = getInstrumentColor(reservation.instrumentId);

                        return (
                          <div
                            className="month-calendar-chip"
                            key={reservation.id}
                            style={{
                              background: color.background,
                              borderColor: color.border,
                              color: color.text
                            }}
                            title={`${reservation.instrumentName} • ${reservation.userName}`}
                          >
                            {reservation.instrumentName} • {reservation.userName}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
