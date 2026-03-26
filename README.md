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
