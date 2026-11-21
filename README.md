# Lab Internal Tool

Local-first internal website for a lab team. The first version includes:

- home page
- individual user login
- instrument registry
- manual uploads tied to instruments
- in-app maintenance sheet for each instrument
- shared reservation calendar with overlap prevention

## Stack

- Next.js
- Prisma
- SQLite for local-first development

SQLite keeps setup simple on one always-on lab machine. The Prisma schema is structured so we can migrate to Postgres later if you decide to publish to a domain or move to a larger server.

## Setup

1. Copy `.env.example` to `.env`
2. Set `SESSION_SECRET` to a long random string
3. For local network HTTP access, keep `SESSION_COOKIE_SECURE="false"`
4. If you later move to HTTPS, set `APP_URL` to your `https://...` address and `SESSION_COOKIE_SECURE="true"`
5. Set `MARKETING_SITE_URL` to the public ANEE / WordPress homepage you want the app's `Home` button to return to
6. Install dependencies
7. Run the database migration
8. Seed the default admin account
9. Start the app

```bash
npm install
npm run prisma:migrate -- --name init
npm run prisma:generate
npm run prisma:seed
npm run dev
```

## Default admin seed

The seed reads these variables from `.env`:

- `DEFAULT_ADMIN_NAME`
- `DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_PASSWORD`

## SMTP reminders

The app now supports SMTP-based reminder emails for instruments that remain unavailable past their review date.

Set these variables in `.env` or Render:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `REMINDER_JOB_TOKEN`

Then run:

```bash
npm run reminders:unavailability
```

What it does:

- finds instruments still marked `Unavailable`
- checks whether `Unavailable until` is today or earlier
- emails the instrument owner once
- records `unavailableReminderSentAt` so the same reminder is not resent repeatedly

If the owner updates the unavailable state again, the reminder is reset and can be sent again on the next due date.

## Product notes

- Admins add instruments and upload manuals
- Maintenance logs are stored as structured rows in the database, not as uploaded Excel files
- Logged-in users can reserve instrument time slots
- Reservation conflicts are blocked server-side

## Running 24/7 locally

For a lab computer that stays on continuously, a simple first deployment path is:

1. Install dependencies on that machine
2. Build the app with `npm run build`
3. Run it with `npm run start`
4. Put it behind a process manager like `pm2` or `systemd`
5. Point other lab computers to the host machine's local network IP

## Deploying to Render

This repo now includes a [render.yaml](/Users/gsharma/Documents/Lab%20Internal%20Tool/render.yaml) blueprint for a small paid Render web service with a persistent disk.

Why the disk matters:

- Render's default filesystem is ephemeral
- this app stores uploaded manuals on disk
- SQLite also needs a stable file location if we keep the current database setup

The blueprint uses:

- `DATABASE_URL=file:/opt/render/project/src/storage/render.db`
- `STORAGE_ROOT=/opt/render/project/src/storage`
- a persistent disk mounted at `/opt/render/project/src/storage`
- `npm install --include=dev` during the Render build so Next.js type-checking has TypeScript and `@types/*` packages available

Suggested Render flow:

1. Push this repo to GitHub.
2. In Render, create a new Blueprint or Web Service from the repo.
3. Let Render read `render.yaml`.
4. Set the missing secret values in Render:
   - `APP_URL`
     Example: `https://tool.amboies.com`
   - `DEFAULT_ADMIN_EMAIL`
   - `DEFAULT_ADMIN_PASSWORD`
5. Deploy the service.
6. After the first deploy, open the Render Shell and run:

```bash
npm run prisma:seed
```

7. Add a custom domain such as `tool.amboies.com` or `booking.amboies.com`.
8. In your DNS, point that subdomain to Render.
9. In WordPress, add a custom menu link to the deployed tool URL.

If you want automatic reminder emails in production, schedule this command to run daily:

```bash
npm run reminders:trigger
```

In the provided Render blueprint, the cron service calls the web app's protected reminder endpoint once per day.

Important:

- set the same `REMINDER_JOB_TOKEN` on both the web service and the cron service
- the cron does not touch SQLite directly
- instead it POSTs to `/api/reminders/unavailability` on the main app

Suggested SMTP provider:

- Resend is the easiest fit for this app because it supports standard SMTP and has a friendly low-volume tier for transactional mail

Typical Resend SMTP settings:

- `SMTP_HOST=smtp.resend.com`
- `SMTP_PORT=465` or `587`
- `SMTP_SECURE=true` for `465`, `false` for `587`
- `SMTP_USER=resend`
- `SMTP_PASS=<your Resend API key>`
- `SMTP_FROM=<verified sender address>`

For the app header:

- `Home` returns to `MARKETING_SITE_URL`
- set that to `https://amboies.com/`

If you later want `amboies.com/anee` exactly instead of a subdomain, you will need a reverse proxy or CDN rewrite in front of the site, not just a WordPress menu edit.

## Next recommended upgrades

- password reset flow
- edit/delete reservations
- richer calendar views
- instrument-specific booking rules
- email notifications
- Postgres migration for multi-device robustness

## Homepage safety and shared-impact calendar

Signed-in members and admins see a weekly homepage calendar. Each Monday–Friday has one 9 am and one 6 pm safety evaluation signup, in `LAB_TIMEZONE` (default `America/Los_Angeles`). A unique database constraint prevents concurrent double claims. Members can release their own future slots; admins can release any future slot. Temporary accounts retain their existing restricted instrument calendar access.

The instrument calendar remains the master source for every reservation and contains no safety signups. The homepage reads the same reservations, including bookings spanning multiple days, for instruments categorized as Laser, CNT reactor, Fumehood, or marked Cross-shared. Owners and admins edit these settings under Instrument details. The migration categorizes existing names containing laser, CNT/nanotube reactor, or fume hood; owners should review unusual names.

Open `/instruments/labels` to print all instrument QR labels, or use Print QR label on an instrument page. Labels link to permanent `https://lab.amboies.com/instruments/<id>` pages, preserve the destination through login, and are generated locally. Print at 100% on Letter paper with browser headers/footers disabled; labels measure 3.5 × 2 inches.

The UI uses Stanford Cardinal red, Source Sans 3 and Source Serif 4, following the [Stanford identity guide](https://identity.stanford.edu/).

Render runs `prisma migrate deploy` before starting the service, applying the additive safety-signup and instrument-visibility migration automatically.

## Weekly safety signup series (2026–2028)

“Reserve weekly” books the selected weekday/time from the selected date through that quarter's last examination day, including holidays within the quarter. “This date only” is available for cover and quarter breaks. “Cancel this date” frees just that occurrence; “Cancel remaining quarter” frees every future occurrence in that series while preserving past assignments. Existing one-off reservations are not converted. If any occurrence is occupied, the whole new series is rejected with no partial booking.

Quarter bounds in `src/lib/academic-quarters.ts` use Stanford's detailed 2025–26 and 2026–27 calendars, plus the Registrar's multi-year projection linked from https://studentservices.stanford.edu/calendar-events/academic-calendars/future-academic-calendars for Autumn 2027 through Autumn 2028. Future dates are subject to change. Holidays are not automatically excluded because these are lab safety duties rather than class meetings.

The instrument booking form no longer displays the Purpose field, and instrument pages no longer display the Maintenance sheet. Existing stored data is retained.

Regression check (after migrations on the isolated test database):
`DATABASE_URL=file:/private/tmp/lab-calendar-test.db node --import tsx scripts/test-quarter-signups.ts`

## Homepage schedule launch

Safety signups launch on January 4, 2027 (Winter quarter). Before launch, the homepage defaults to that week; afterwards it defaults to the current lab week. Earlier navigation is clamped, elapsed safety slots and completed shared bookings are hidden, and the server rejects pre-launch safety signups. Historical records remain stored. The redundant bookings summary and design-credit footer have been removed from the homepage.

Run the schedule boundary checks with `node --import tsx scripts/test-home-schedule.ts`.
