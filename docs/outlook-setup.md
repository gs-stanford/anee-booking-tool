# Direct Outlook calendar connection

The implementation exports each connected user's instrument bookings, owned lab meetings and cross-impact events, explicit invitations, assigned safety shifts, and Tea Time presentations into a separate **Boies Lab** calendar. It does not import unrelated lab events or read Outlook appointment contents. Changes are one-way from the lab site to Outlook. No invitation emails are sent by this integration.

## Microsoft / Stanford setup

Stanford UIT requires review of third-party Microsoft 365 integrations: https://uit.stanford.edu/guide/m365plugins . Request an Entra web application for **Boies Lab calendar sync** in the Stanford tenant. Standard Microsoft Graph APIs are included in existing user licensing within Microsoft's published limits: https://learn.microsoft.com/en-us/graph/metered-api-overview .

Register the application as **Web**, single tenant for Stanford accounts. Configure:

- Redirect URI: `https://lab.amboies.com/api/outlook/callback`
- Microsoft Graph **delegated** permissions: `User.Read`, `Calendars.ReadWrite`.
- Optional Teams permission: delegated `OnlineMeetings.ReadWrite`. Enable `OUTLOOK_TEAMS_ENABLED=true` only after approval; existing users must reconnect to consent to the additional scope. This uses `/me/onlineMeetings/createOrGet` with a stable event ID, then updates/deletes the organizer’s meeting. The same join URL is copied to invitees; no separate Teams meeting is created for each invitee.
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

After linking, **Sign in with Microsoft** on `/login` signs into the existing lab account using the stored Microsoft object ID. No account creation or email matching is performed. State, PKCE, and expiry are checked in both flows; linking also checks the initiating lab session.

Disconnect disables Microsoft sign-in and stops new updates and retains existing Outlook entries. Reconnecting the same account reuses its calendar and mappings. Switching Microsoft accounts after disconnect creates a new calendar in the new account; the previous account's entries and Teams meetings remain. Cancel those in the previous account if needed.

## Optional Teams meetings

General Lab Meeting is the default booking type, with optional location and notes. Meetings are visible to lab members on the shared calendar. With approved Teams configuration and a linked organizer, the form allows a Teams meeting. Teams links are generated asynchronously and shown on the event; Account shows failures and offers retry/reconnect. A meeting update keeps the same link; disabling Teams or canceling the lab event queues remote meeting deletion. Disconnected accounts cannot process that deletion until reconnected. Past meetings remain as history. A standalone Teams link is included in Outlook event notes; this is not a native Outlook meeting invitation and does not send invitations or manage RSVPs. Tenant licensing and policies must allow meeting creation.

All connected organizers' Teams links are prepared before calendar copies are synced, so invitees receive the same link. A Teams failure does not prevent ordinary calendar copies from syncing. A scheduled retry runner is recommended for failed operations and deletions.

The ready-to-submit request is in `stanford-it-outlook-request.txt`. Submit via Stanford UIT's review entry point linked above; do not send credentials in a ticket.

## Verification before enabling broadly

Use an approved test mailbox: connect; create, move and cancel a booking; invite another lab account; check only the intended users receive copies. Verify a safety cancellation and Tea Time presenter swap remove the prior assignee's future event. Test linked Microsoft sign-in, rejection of unlinked/disconnected identities, reconnect, revoked consent, and the retry job. For Teams, verify creation, one shared link for organizer/invitee, rescheduling, disabling Teams, and cancellation. Local automated tests mock Microsoft Graph; they do not replace this tenant-level acceptance check.

## Invitation rollout gate

`OUTLOOK_INVITES_ENABLED` defaults to false. Keep it off until the invitation workflow is approved and tested. Microsoft configuration alone does not expose the invite list. **Inbox invitation notifications are not implemented by the current calendar-copy sync**; the gate must stay off for the requested inbox-notification rollout until that work and any required review are complete.

Once enabled, recipients must be non-temporary lab members with an active Outlook connection, at least one successful sync, and explicit lab-admin approval under **Admin → User accounts → Approve invitations**. Approval defaults to false, including existing connections. Disconnecting clears approval; switching Microsoft identities creates a new unapproved connection. The organizer is shown as automatically included, rather than omitted from the list. This does not require a self-invitation.

The server enforces recipient eligibility, and sync checks eligibility again before exporting invited events. Revoked approval removes future invitation-only copies on the next successful sync; owned bookings and assigned shifts continue syncing. Ordinary edits while invitations are hidden preserve previously stored invitees. Revocation does not send an inbox notification.
