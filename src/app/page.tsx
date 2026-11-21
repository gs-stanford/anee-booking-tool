import { getStartOfLabWeekDateKey } from "@/lib/lab-time";
import { homeScheduleWeek } from "@/lib/home-schedule";
import { HomeCalendar } from "@/components/home-calendar";
import { Notice } from "@/components/notice";
import { getNotice, getSingleParam } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { Role } from "@prisma/client";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function loadHomeData() {
  try {
    const [instrumentCount, userCount, upcomingReservationCount, instruments] = await Promise.all([
      db.instrument.count(),
      db.user.count(),
      db.reservation.count({ where: { endAt: { gte: new Date() } } }),
      db.instrument.findMany({ orderBy: { createdAt: "desc" }, take: 4 })
    ]);
    return { instrumentCount, userCount, upcomingReservationCount, instruments };
  } catch {
    // Fresh setups render the landing page before migrations exist.
    return {
      instrumentCount: 0,
      userCount: 0,
      upcomingReservationCount: 0,
      instruments: []
    };
  }
}

export default async function HomePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const notice = getNotice(query);
  const jumpDate = getSingleParam(query, "date");
  const jump = jumpDate && /^\d{4}-\d{2}-\d{2}$/.test(jumpDate) ? Date.parse(`${jumpDate}T12:00:00Z`) : NaN;
  const parsedWeek = Number.isFinite(jump) ? Math.floor((jump - Date.parse(`${getStartOfLabWeekDateKey(new Date())}T12:00:00Z`)) / 604800000) : Number(getSingleParam(query, "week") ?? 0);
  const week = homeScheduleWeek(parsedWeek);
  const user = await getCurrentUser();
  const data = await loadHomeData();
  const { instrumentCount, userCount, upcomingReservationCount, instruments } = data;
  const isTempUser = user?.role === Role.TEMP;
  const isTempCalendarHeld = Boolean(isTempUser && user?.calendarAccessOnHold);
  const getStatusClassName = (status: string) =>
    status === "AVAILABLE" ? "status-pill status-pill-available" : "status-pill status-pill-unavailable";

  return (
    <>
      <section className="hero">
        <div>
          <span className="tag">Internal workspace</span>
          <h1>The Boies Group</h1>
          <p>
            A shared workspace for safe, coordinated research. Plan instrument time, find operating guides, and keep the lab ready for the next experiment.
          </p>

          <div className="hero-actions">
            <Link className="button button-primary" href={user ? "/instruments" : "/login"}>
              {isTempUser ? "Open calendar" : user ? "Open lab equipment module" : "Log in to continue"}
            </Link>
            {user && !isTempUser ? (
              <Link className="button button-secondary" href="/account">
                Open account
              </Link>
            ) : null}
          </div>
        </div>

        <div className="hero-media">
          <div className="hero-image-shell">
            <Image
              alt="The Boies Group aerosol visualization"
              className="hero-image"
              height={720}
              priority
              src="/aerosol.webp"
              width={720}
            />
          </div>
        </div>
      </section>

      {notice ? <Notice type={notice.type} message={notice.message} /> : null}
      {user && !isTempUser ? <HomeCalendar user={user} week={week} /> : null}

      {isTempUser ? (
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>{isTempCalendarHeld ? "Calendar access pending" : "Lab resources"}</h2>
              <p className="muted">
                Access safety resources
                {isTempCalendarHeld
                  ? " while calendar access waits for SDS review and glovebox walkthrough approval."
                  : " and approved instrument calendar booking."}
              </p>
            </div>
          </div>

          <div className="inline-actions">
            <Link className="button button-primary" href="/safety">
              Open safety tools
            </Link>
            <Link className="button button-secondary" href="/safety/risk-assessment">
              Fill risk assessment
            </Link>
            <Link className="button button-ghost" href="/instruments">
              {isTempCalendarHeld ? "Calendar pending" : "Open calendar"}
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="dashboard-grid">
            <article className="panel">
              <p className="muted">Tracked instruments</p>
              <div className="stat">{instrumentCount}</div>
            </article>
            <article className="panel">
              <p className="muted">Active user accounts</p>
              <div className="stat">{userCount}</div>
            </article>
            <article className="panel">
              <p className="muted">Upcoming reservations</p>
              <div className="stat">{upcomingReservationCount}</div>
            </article>
          </section>

          <section style={{ marginTop: 24 }}>
            <article className="panel">
              <div className="section-head">
                <h2>Live instrument module</h2>
                <Link href="/instruments">Open module</Link>
              </div>
              <div className="list">
                {instruments.length === 0 ? (
                  <p className="muted">No instruments have been added yet.</p>
                ) : (
                  instruments.map((instrument) => (
                    <Link href={`/instruments/${instrument.id}`} className="instrument-card" key={instrument.id}>
                      <h3>{instrument.name}</h3>
                      <div className="meta">
                        <span>{instrument.location}</span>
                        <span className={getStatusClassName(instrument.status)}>
                          {instrument.status === "AVAILABLE" ? "Available" : "Unavailable"}
                        </span>
                      </div>
                      <p>{instrument.description}</p>
                    </Link>
                  ))
                )}
              </div>
            </article>

          </section>
        </>
      )}

    </>
  );
}
