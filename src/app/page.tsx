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
          <span className="tag">ANEE lab operations</span>
          <h1>A cleaner reservation and operations hub for the ANEE lab.</h1>
          <p>
            The site is now styled around a Stanford-inspired editorial palette and supports a stronger booking flow:
            week-view scheduling, individual user accounts, instrument manuals, and a maintenance sheet that lives
            directly inside each instrument page.
          </p>

          <div className="hero-actions">
            <Link className="button button-primary" href={user ? "/instruments" : "/login"}>
              {user ? "Open instrument hub" : "Log in to continue"}
            </Link>
            <Link className="button button-secondary" href="/instruments">
              Browse instruments
            </Link>
          </div>
        </div>

        <aside className="hero-aside">
          <h3>What v2 adds</h3>
          <div className="list">
            <div className="sheet-row">
              <h4>Outlook-style week view</h4>
              <p className="muted">Reservations now sit inside a richer time-grid calendar instead of a simple day list.</p>
            </div>
            <div className="sheet-row">
              <h4>Edit and cancel controls</h4>
              <p className="muted">Users can revise their own bookings, and admins can intervene when scheduling changes.</p>
            </div>
            <div className="sheet-row">
              <h4>ANEE branding</h4>
              <p className="muted">Typography and color are now tuned to a sharper lab identity with Stanford-inspired cues.</p>
            </div>
          </div>
        </aside>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <p className="muted">Instruments tracked</p>
          <div className="stat">{instrumentCount}</div>
        </article>
        <article className="panel">
          <p className="muted">Users with accounts</p>
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
            <h2>Instrument collection</h2>
            <Link href="/instruments">View all</Link>
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
            <h2>Next reservations</h2>
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
    </>
  );
}
