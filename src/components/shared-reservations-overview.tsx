"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ReservationSummary } from "@/lib/reservation-summary";
import type { ReservationCalendarItem } from "@/lib/reservation-calendar";

type InstrumentOption = {
  id: string;
  name: string;
};

type SharedReservationsOverviewProps = {
  summaries: ReservationSummary[];
  calendarItems: ReservationCalendarItem[];
  emptyMessage?: string;
  defaultView?: "list" | "calendar";
  calendarHref?: string;
  instrumentOptions?: InstrumentOption[];
};

type OverviewView = "list" | "calendar";
const MONTH_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DISTINCT_INSTRUMENT_COLORS = [
  { background: "#eef6c8", border: "#b6cb2d", text: "#51620f" },
  { background: "#dfeaff", border: "#6f97f7", text: "#244b9d" },
  { background: "#fde0ea", border: "#ef7b9d", text: "#8f2045" },
  { background: "#ffe7d1", border: "#ec9860", text: "#8a4a12" },
  { background: "#dcf5f1", border: "#4bb9a7", text: "#14665a" },
  { background: "#efe3ff", border: "#a174eb", text: "#583092" },
  { background: "#ffe8bf", border: "#d6a437", text: "#735111" },
  { background: "#e0f0ff", border: "#59a7df", text: "#1d5e91" },
  { background: "#fbe0f8", border: "#da7fd0", text: "#83277c" },
  { background: "#e4f7da", border: "#77bf57", text: "#376824" },
  { background: "#ffe1db", border: "#eb7768", text: "#8b2f23" },
  { background: "#e4ebff", border: "#8598f1", text: "#34489b" },
  { background: "#f7ead7", border: "#d0a15d", text: "#75511d" },
  { background: "#ddf7e8", border: "#59bc84", text: "#1f6b46" },
  { background: "#f3e0ff", border: "#c07ae9", text: "#6d2995" },
  { background: "#e1f6fb", border: "#5cbfd8", text: "#17697d" }
];

function getInstrumentColorMap(instrumentOptions: InstrumentOption[]) {
  return instrumentOptions.reduce<Record<string, (typeof DISTINCT_INSTRUMENT_COLORS)[number]>>((map, instrument, index) => {
    map[instrument.id] = DISTINCT_INSTRUMENT_COLORS[index % DISTINCT_INSTRUMENT_COLORS.length];
    return map;
  }, {});
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
  calendarHref,
  instrumentOptions
}: SharedReservationsOverviewProps) {
  const [view, setView] = useState<OverviewView>(defaultView);
  const [monthOffset, setMonthOffset] = useState(0);
  const monthStart = getMonthStart(monthOffset);
  const monthKeyPrefix = toDateKey(monthStart).slice(0, 7);
  const viewOrder: OverviewView[] = defaultView === "calendar" ? ["calendar", "list"] : ["list", "calendar"];
  const availableInstrumentOptions = useMemo(() => {
    if (instrumentOptions && instrumentOptions.length > 0) {
      return instrumentOptions;
    }

    const map = new Map<string, InstrumentOption>();
    calendarItems.forEach((item) => {
      if (!map.has(item.instrumentId)) {
        map.set(item.instrumentId, {
          id: item.instrumentId,
          name: item.instrumentName
        });
      }
    });
    return Array.from(map.values());
  }, [calendarItems, instrumentOptions]);
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>(
    availableInstrumentOptions.map((instrument) => instrument.id)
  );

  const reservationsByDay = useMemo(() => {
    return calendarItems
      .filter((reservation) => selectedInstrumentIds.includes(reservation.instrumentId))
      .reduce<Record<string, ReservationCalendarItem[]>>((map, reservation) => {
      if (!map[reservation.date]) {
        map[reservation.date] = [];
      }

      map[reservation.date].push(reservation);
      return map;
    }, {});
  }, [calendarItems, selectedInstrumentIds]);

  const instrumentColors = useMemo(
    () => getInstrumentColorMap(availableInstrumentOptions),
    [availableInstrumentOptions]
  );

  const visibleGrid = buildMonthGrid(monthStart);
  const visibleCount = calendarItems.filter(
    (reservation) =>
      selectedInstrumentIds.includes(reservation.instrumentId) && reservation.date.startsWith(monthKeyPrefix)
  ).length;

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
              onClick={() => setMonthOffset((currentOffset) => currentOffset - 1)}
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
                {visibleCount === 0
                  ? "No bookings in this month yet."
                  : `${visibleCount} booking${visibleCount === 1 ? "" : "s"} shown.`}
              </p>
            </div>
          </div>

          <div className="calendar-filter-shell">
            <div className="calendar-filter-toolbar">
              <strong>Visible instruments</strong>
              <div className="inline-actions">
                <button
                  className="button button-small button-ghost"
                  onClick={() => setSelectedInstrumentIds(availableInstrumentOptions.map((instrument) => instrument.id))}
                  type="button"
                >
                  Select all
                </button>
                <button
                  className="button button-small button-ghost"
                  onClick={() => setSelectedInstrumentIds([])}
                  type="button"
                >
                  Clear all
                </button>
              </div>
            </div>

            <div className="calendar-filter-list">
              {availableInstrumentOptions.map((instrument) => {
                const color = instrumentColors[instrument.id];
                const isSelected = selectedInstrumentIds.includes(instrument.id);

                return (
                  <button
                    className={`calendar-filter-chip${isSelected ? " calendar-filter-chip-active" : ""}`}
                    key={instrument.id}
                    onClick={() =>
                      setSelectedInstrumentIds((currentIds) =>
                        currentIds.includes(instrument.id)
                          ? currentIds.filter((instrumentId) => instrumentId !== instrument.id)
                          : [...currentIds, instrument.id]
                      )
                    }
                    style={
                      isSelected
                        ? {
                            background: color.background,
                            borderColor: color.border,
                            color: color.text
                          }
                        : undefined
                    }
                    type="button"
                  >
                    <span
                      className="calendar-filter-dot"
                      style={{ background: color.border }}
                    />
                    {instrument.name}
                  </button>
                );
              })}
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
                        const color = instrumentColors[reservation.instrumentId] ?? DISTINCT_INSTRUMENT_COLORS[0];

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
                        const color = instrumentColors[reservation.instrumentId] ?? DISTINCT_INSTRUMENT_COLORS[0];

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
