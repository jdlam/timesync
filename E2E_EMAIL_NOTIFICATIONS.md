# E2E: Response Notification Emails

Manual procedure for verifying response-notification emails against a **live** deployment
(production at www.timesync.me, or a Vercel preview). Re-run this whenever you touch
`convex/email_actions.ts`, `convex/responses.ts` (submit/update), the lame-mail
`timesync/notification` template, or the shared `base-layout`.

## Why this can't be a unit test

`npm run test` asserts on what gets *scheduled* — the right action, the right
args. It cannot see what SES actually delivers, how the email renders in a real inbox, or
whether Gmail threads the messages correctly. A production deploy has already shipped a bug
that a fully green local suite missed. This live check is the last gate before those code
paths ship.

## Prerequisite

The event's creator must be signed in (not a guest) and the event needs
`notifyOnResponse: true`. Both conditions have to hold — a guest-created event sends no
notifications at all, by design.

## Setup

Sign in as the event creator. Notifications go to that account's email.

## Procedure

1. Create an event via **Create Event** (`/events/create`). Any single date, default
   9:00 AM–5:00 PM, 30-minute slots. Leave **"Email me when someone responds" checked**
   (it's checked by default). Grab the public link from the "Event Created Successfully!"
   dialog — it also arrives by email as `Your TimeSync event "<title>" is ready`.
2. Open the public link, select 2 slots, enter name `Alex Chen`, click **Submit
   Availability**.
3. The page now reads "Update Your Availability." Select one more slot and click
   **Update Response**.
4. Click **"Not <name>? Submit a new response,"** select a slot, enter name `Jordan
   Rivera`, click **Submit Availability**.

You should now have exactly 3 notification emails in the creator's inbox.

## Assertions

Values below are from a real run against production on 2026-08-01, event title
`Email Notification E2E`. Your event title will differ — substitute accordingly.

### Email 1 — new response (Alex Chen submits)

- [ ] Subject: `New response to "Email Notification E2E"`
- [ ] Inbox preview line: `Alex Chen just submitted their availability — 1 response so
      far.` (not a repeat of the subject — this confirms the preheader is working)
- [ ] Heading: `New response to "Email Notification E2E"`
- [ ] Body: `Alex Chen just submitted their availability.`
- [ ] Count line: `1 response so far` (singular)
- [ ] CTA button labeled `View results`, linking to `/admin/<token>`
- [ ] Footer: `TimeSync` / `New York, NY` / underlined `Turn off emails for this event`

### Email 2 — the update (Alex Chen adds a slot)

This is the riskiest behavior to verify: before this shipped, editing a response notified
nobody.

- [ ] Subject is **byte-identical to Email 1**. This is deliberate — it's what makes Gmail
      thread the messages. There's an INVARIANT comment in `convex/email_actions.ts`
      spelling this out; giving the update a unique subject breaks the anti-spam design.
- [ ] Preview line: `Alex Chen just updated their availability — 1 response so far.`
- [ ] Heading: `Updated response to "Email Notification E2E"` — this and the body/preview
      are the only places submit vs. update is distinguished
- [ ] Body: `Alex Chen just updated their availability.`
- [ ] Count: still `1 response so far` — an update must not increment the count

### Email 3 — second responder (Jordan Rivera submits)

- [ ] Subject byte-identical to Email 1 and 2
- [ ] Body: `Jordan Rivera just submitted their availability.`
- [ ] Count: `2 responses so far` (plural)

### Threading — the headline assertion

- [ ] In the Gmail inbox list, all three emails collapse into **one conversation row**
      with a `3` badge, not three separate rows. Separate rows means threading is broken
      and the anti-spam design has regressed.

## Expected, not bugs

Two things will look wrong on first glance. They aren't.

1. **Gmail collapses the footer** on the 2nd and 3rd messages behind a `...` toggle,
   because the footer text is identical across the thread and Gmail treats it as quoted
   text. The mute link is fully visible on the first message. This is an inherent
   consequence of the stable-subject threading design, not something to fix.
2. **The email card renders white inside Gmail's dark theme.** Legible, but it's a known
   open item — a `color-scheme` meta tag is on the backlog.

## Cleanup

Delete the test event from the **My Events** list's ⋮ menu → Delete. This path is clean:
confirm dialog, success toast, row disappears.

Deleting from the event's own admin dashboard also works fine.
