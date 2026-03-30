import Image from "next/image";
import Link from "next/link";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function loadHomeData() {
  try {
    const [instrumentCount, userCount, upcomingReservations, instruments] = await Promise.all([
      db.instrument.count(),
      db.user.count(),
      db.reservation.findMany({
        where: {
          endAt: {
            gte: new Date()
          }
        },
        orderBy: {
          startAt: "asc"
        },
        take: 5,
        include: {
          instrument: true,
          user: true
        }
      }),
      db.instrument.findMany({
        orderBy: {
          createdAt: "desc"
        },
        take: 4
      })
    ]);

    return {
      instrumentCount,
      userCount,
      upcomingReservations,
      instruments
    };
  } catch {
    // Fresh setups render the landing page before migrations exist.
    return {
      instrumentCount: 0,
      userCount: 0,
      upcomingReservations: [],
      instruments: []
    };
  }
}

export default async function HomePage() {
  const [user, data] = await Promise.all([getCurrentUser(), loadHomeData()]);
  const { instrumentCount, userCount, upcomingReservations, instruments } = data;

  return (
    <>
      <section className="hero">
        <div>
          <span className="tag">Internal workspace</span>
          <h1>ANEE Lab Internal Tool</h1>
          <p>
            This is the internal operating hub for the ANEE lab. Instruments, inventory sheets, and purchase-request
            trackers now live behind the same sign-in, with more internal workflows ready to slot in as the tool grows.
          </p>

          <div className="hero-actions">
            <Link className="button button-primary" href={user ? "/instruments" : "/login"}>
              {user ? "Open lab equipment module" : "Log in to continue"}
            </Link>
            {user ? (
              <Link className="button button-secondary" href="/account">
                Open account
              </Link>
            ) : null}
          </div>
        </div>

        <div className="hero-media">
          <div className="hero-image-shell">
            <Image
              alt="ANEE aerosol visualization"
              className="hero-image"
              height={720}
              priority
              src="/aerosol.webp"
              width={720}
            />
          </div>
        </div>
      </section>

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
          <div className="stat">{upcomingReservations.length}</div>
        </article>
      </section>

      <section className="two-column landing-columns" style={{ marginTop: 24 }}>
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
                    <span>{instrument.status}</span>
                  </div>
                  <p>{instrument.description}</p>
                </Link>
              ))
            )}
          </div>
        </article>

        <article className="panel">
          <div className="section-head">
            <h2>Upcoming reservations</h2>
          </div>
          <div className="list">
            {upcomingReservations.length === 0 ? (
              <p className="muted">No reservations scheduled yet.</p>
            ) : (
              upcomingReservations.map((reservation) => (
                <div className="reservation-row" key={reservation.id}>
                  <strong>{reservation.instrument.name}</strong>
                  <div className="meta">
                    <span>{reservation.user.name}</span>
                    <span>{formatDateTime(reservation.startAt)}</span>
                    <span>{reservation.endAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                  </div>
                  {reservation.purpose ? <p>{reservation.purpose}</p> : null}
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <p className="page-credit">Designed by Gaurav, 2026.</p>
    </>
  );
}
