# Direct Outlook calendar connection

The implementation exports each connected user's instrument bookings, owned cross-impact events, explicit invitations, assigned safety shifts, and Tea Time presentations into a separate **Boies Lab** calendar. It does not import unrelated lab events or read Outlook appointment contents. Changes are one-way from the lab site to Outlook. No invitation emails are sent by this integration.

## Microsoft / Stanford setup

Stanford UIT requires review of third-party Microsoft 365 integrations: https://uit.stanford.edu/guide/m365plugins . Request an Entra web application for **Boies Lab calendar sync** in the Stanford tenant. Standard Microsoft Graph APIs are included in existing user licensing within Microsoft's published limits: https://learn.microsoft.com/en-us/graph/metered-api-overview .

Register the application as **Web**, preferably single tenant for Stanford accounts. Configure:

- Redirect URI: `https://lab.amboies.com/api/outlook/callback`
- Microsoft Graph **delegated** permissions: `User.Read`, `Calendars.ReadWrite`.
- OAuth scope `offline_access` for refresh tokens. The app uses authorization code flow with PKCE.
- A client credential. This implementation accepts a client secret; store its value directly in Render's environment settings, never in Git or chat. Record its expiration and rotate before it expires.
- Obtain Stanford approval/consent as required by its tenant policy. Do not use application-wide calendar permissions.

Set these environment variables on the existing Render web service and redeploy:

```
OUTLOOK_CLIENT_ID=<Application (client) ID>
OUTLOOK_TENANT_ID=<Directory (tenant) ID>
OUTLOOK_CLIENT_SECRET=<secret value>
OUTLOOK_TOKEN_ENCRYPTION_KEY=<32 random bytes, base64 encoded>
APP_URL=https://lab.amboies.com
```

Generate the encryption key locally with `openssl rand -base64 32`, then save the result directly in Render. Keep this key stable and backed up: refresh tokens are encrypted with AES-256-GCM. The app checks OAuth state, PKCE, expiry, and the initiating lab user before linking a Microsoft account.

Users then open **Account → Outlook calendar → Connect Outlook**. The button appears only after the configuration is present. A user connects their own Microsoft account through Microsoft's consent page; no Microsoft password is handled by the lab site.

## Sync and retries

Successful calendar mutations schedule a background sync after the response, so Outlook latency does not block reservations. Stable source mappings and Graph transaction IDs prevent duplicate creation on retries. Per-user leases prevent concurrent writers. Deleted bookings and removed invitations delete their future synced copies; completed entries remain as history. A sync failure is shown in Account, with **Sync now** and **Reconnect** controls.

For durable retries after restarts, throttling, or temporary Microsoft failures, schedule an existing authorized job runner to POST every five minutes to `https://lab.amboies.com/api/outlook/sync` with `Authorization: Bearer <OUTLOOK_SYNC_JOB_TOKEN>`. Set a long random `OUTLOOK_SYNC_JOB_TOKEN` on the web service and keep it secret in the runner. No new paid hosting service is provisioned by this change.

Disconnect stops new updates and retains existing Outlook entries. Reconnecting the same account reuses its calendar and mappings. Switching Microsoft accounts after disconnect creates a new calendar in the new account; the previous account's entries remain.

## Verification before enabling broadly

Use an approved test mailbox: connect; create, move and cancel a booking; invite another lab account; check only the intended users receive copies. Verify a safety cancellation and Tea Time presenter swap remove the prior assignee's future event. Test reconnect, revoked consent, and the retry job. Local automated tests mock Microsoft Graph; they do not replace this tenant-level acceptance check.
