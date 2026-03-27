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
  const menuItems = [
    {
      number: "1",
      title: "Lab Equipment and Instruments",
      description: "Instrument pages, manuals, maintenance sheets, and booking calendars.",
      href: "/instruments",
      status: "Live"
    },
    {
      number: "2",
      title: "Inventory Management",
      description: "Use the Inventory dropdown in the top navigation for gas cylinders, chemicals, consumables, and standard parts.",
      href: null,
      status: "Live in header"
    },
    {
      number: "3",
      title: "Purchase Requests",
      description: "Submit equipment and supply requests with internal review routing.",
      href: null,
      status: "Coming soon"
    },
    {
      number: "4",
      title: "Team Meetings",
      description: "Shared notes, agendas, and recurring lab meeting coordination.",
      href: null,
      status: "Coming soon"
    },
    {
      number: "5",
      title: "Safety",
      description: "Training records, SDS access, and lab safety references.",
      href: null,
      status: "Coming soon"
    }
  ];

  return (
    <>
      <section className="hero">
        <div>
          <span className="tag">Internal workspace</span>
          <h1>ANEE Lab Internal Tool</h1>
          <p>
            This is the internal operating hub for the ANEE lab. The first live module is the instrument and
            reservation system, and the rest of the major lab menus are staged here so we can expand the tool
            section by section.
          </p>

          <div className="hero-actions">
            <Link className="button button-primary" href={user ? "/instruments" : "/login"}>
              {user ? "Open lab equipment module" : "Log in to continue"}
            </Link>
            <Link className="button button-secondary" href={user ? "/account" : "/login"}>
              {user ? "Open account" : "View sign-in"}
            </Link>
          </div>
        </div>

        <aside className="hero-aside">
          <h3>Current system status</h3>
          <div className="list">
            <div className="sheet-row">
              <h4>{instrumentCount} tracked instruments</h4>
              <p className="muted">The core instrument module is live for the lab and ready for shared scheduling.</p>
            </div>
            <div className="sheet-row">
              <h4>{userCount} active user accounts</h4>
              <p className="muted">Individual sign-in, admin user management, and personal password changes are enabled.</p>
            </div>
            <div className="sheet-row">
              <h4>{upcomingReservations.length} upcoming reservations</h4>
              <p className="muted">The booking calendar supports direct block selection, editing, and cancellation.</p>
            </div>
          </div>
        </aside>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h2>Lab menus</h2>
            <p className="muted">Module 1 is active now. The remaining sections are queued for future buildout.</p>
          </div>
        </div>

        <div className="menu-grid">
          {menuItems.map((item) => {
            const content = (
              <>
                <div className="menu-card-top">
                  <span className="menu-card-index">{item.number}</span>
                  <span className={`tag${item.href ? "" : " tag-muted"}`}>{item.status}</span>
                </div>
                <h3>{item.title}</h3>
                <p className="muted">{item.description}</p>
              </>
            );

            return item.href ? (
              <Link className="menu-card" href={item.href} key={item.number}>
                {content}
              </Link>
            ) : (
              <article className="menu-card menu-card-disabled" key={item.number}>
                {content}
              </article>
            );
          })}
        </div>
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
    </>
  );
}
