# TimeSync - User Stories

**Version:** 1.3
**Last Updated:** 2026-02-06
**Based on PRD:** Version 1.0

---

## Story Priority Legend
- **P0** - Critical path, must-have for MVP
- **P1** - Important, should have for launch
- **P2** - Nice to have, can be added post-launch

## Implementation Status Legend
- ✅ Implemented
- ⚠️ Partially Implemented
- ❌ Not Implemented

---

## Epic 1: Guest Event Creation (No Auth)

### Story 1.1 - Create Event as Guest User [P0] ✅
**As a** guest user (not logged in)
**I want to** create a scheduling event without signing up
**So that** I can quickly coordinate with my group without friction

**Acceptance Criteria:**
- [x] User can access event creation form from homepage
- [x] User can enter event title (required, max 255 chars)
- [x] User can enter optional description (text area)
- [x] User can select timezone from dropdown (defaults to browser timezone)
- [x] User can choose slot duration: 15min, 30min, or 60min
- [x] User can select date range (max 14 days for free tier)
- [x] User can set time range (e.g., 9:00 AM - 5:00 PM)
- [x] System generates unique public link (shareable)
- [x] System generates unique admin link (secret, for creator only)
- [x] Both links are displayed prominently after creation
- [x] User can copy both links with one-click copy buttons
- [x] Event is created without requiring authentication

**Technical Notes:**
- Admin link uses `adminToken` (UUID) for access
- Store `creatorId` as Clerk subject ID if logged in, `undefined` for guests
- Default `maxRespondents` to 5 (free tier)
- Uses Convex backend with real-time subscriptions
- Logged-in users can view their events at `/my-events`

---

### Story 1.2 - Access Admin Dashboard via Secret Link [P0] ✅
**As a** guest event creator
**I want to** access my event's admin dashboard using the secret link
**So that** I can view responses and manage the event without logging in

**Acceptance Criteria:**
- [x] User can access admin dashboard by clicking admin link
- [x] URL contains unique admin token (not guessable)
- [x] Dashboard shows event details (title, dates, time range)
- [x] Dashboard shows all respondent availability
- [x] Dashboard shows heatmap visualization
- [x] User can see who responded
- [x] User can click a response to see their individual selection highlighted
- [x] User can edit event details (via `EditEventDialog`)
- [x] User can deactivate/activate and delete the event via admin token
- [x] Link works on any device/browser (not cookie-based)

**Technical Notes:**
- Validate `adminToken` in URL against database
- No session storage required
- Token should be sufficiently long to prevent brute force
- Edit event implemented via `EditEventDialog` component with `editEventSchema` validation
- Toggle status and delete implemented via `toggleStatusByAdminToken` and `deleteByAdminToken` mutations

---

### Story 1.3 - Edit Event Details (Admin) [P1] ✅
**As an** event creator (guest or registered)
**I want to** edit my event details after creation
**So that** I can fix mistakes or update information

**Acceptance Criteria:**
- [x] Admin can edit event title
- [x] Admin can edit description
- [x] Admin can modify date range (within tier limits)
- [x] Admin can modify time range
- [x] Admin cannot change slot duration (would invalidate existing responses)
- [x] Changes are saved immediately
- [x] Updated event reflects changes for all invitees
- [x] Warning shown if changes affect existing responses

**Technical Notes:**
- Prevent changing `slotDuration` after responses exist
- Update `_creationTime` handled by Convex automatically
- Implemented via `EditEventDialog` component with `editEventSchema` validation
- Backend mutation: `api.events.update` with admin token verification

---

## Epic 2: Respondent Experience (Invitee Flow)

### Story 2.1 - View Event and Submit Availability [P0] ✅
**As an** invitee (respondent)
**I want to** view the event details and select my availability
**So that** I can indicate when I'm free without creating an account

**Acceptance Criteria:**
- [x] User accesses event via public link
- [x] Event title and description are clearly displayed
- [x] Date range and time slots are visible
- [x] Grid shows all available time slots
- [x] User enters their name (required)
- [x] User can optionally add a comment
- [x] User can click/tap cells to mark availability (green)
- [x] User can click/tap again to unmark (gray)
- [x] Desktop: Click and drag to paint multiple cells
- [x] Mobile: Tap individual cells (responsive grid)
- [x] Submit button saves their response
- [x] Success message shown after submission
- [x] User receives edit link to modify response later

**Technical Notes:**
- Generate unique `editToken` on submission
- Store selections as array of ISO timestamps in `selectedSlots`
- No authentication required

---

### Story 2.2 - Edit Response Using Edit Link [P1] ✅
**As a** respondent
**I want to** edit my availability after submitting
**So that** I can update my schedule if it changes

**Acceptance Criteria:**
- [x] User clicks edit link received after initial submission
- [x] Previous selections are pre-filled in grid
- [x] User can modify selections (add/remove time slots)
- [x] User can update their name
- [x] User can update their comment
- [x] Submit updates the existing response (doesn't create duplicate)
- [x] Updated response reflects immediately in admin dashboard

**Technical Notes:**
- Use `editToken` to identify and update existing response
- Convex handles real-time updates automatically

---

### Story 2.3 - Mobile-Responsive Availability Grid [P0] ✅
**As an** invitee on mobile
**I want to** easily select my availability on a small screen
**So that** I can respond without pinching/zooming

**Acceptance Criteria:**
- [x] Grid automatically adapts to mobile viewport
- [x] Days displayed in accordion view on mobile (expandable dates)
- [x] Time slots are large enough to tap accurately (min 44x44px)
- [x] Desktop uses table view with sticky time column
- [x] Selection works smoothly without lag
- [x] Visual feedback on tap (immediate color change)

**Technical Notes:**
- CSS Grid with responsive breakpoints
- Accordion component for mobile date selection
- Tested on iOS Safari and Chrome Android

---

## Epic 3: Results Visualization & Heatmap

### Story 3.1 - View Results Heatmap [P0] ✅
**As an** event creator
**I want to** see a heatmap of all availability
**So that** I can quickly identify the best meeting times

**Acceptance Criteria:**
- [x] Admin dashboard shows grid with all time slots
- [x] Cell opacity/color represents overlap percentage
- [x] 100% overlap = Dark Green
- [x] 0% overlap = Light Gray
- [x] Gradual color scale for percentages in between
- [x] Legend explains color coding
- [x] Best times are visually obvious at a glance

**Technical Notes:**
- Calculate: `overlap_score = (count_available / total_respondents) * 100`
- Use HSL color interpolation for smooth gradient

---

### Story 3.2 - Hover to See Respondent Details [P0] ✅
**As an** event creator
**I want to** hover over a time slot to see who's available
**So that** I can understand the breakdown beyond just the percentage

**Acceptance Criteria:**
- [x] Hovering over a cell shows tooltip/popover
- [x] Tooltip lists names of available respondents
- [x] Tooltip shows count (e.g., "5 of 8 available")
- [x] Works on desktop (hover)
- [x] Works on mobile (tap response card to highlight their selections)
- [x] Tooltip doesn't obscure other cells

**Technical Notes:**
- Uses Radix UI Popover component
- Position tooltip dynamically to stay in viewport

---

### Story 3.3 - Export Results to CSV [P1] [Premium] ✅
**As a** premium event creator
**I want to** export the results to CSV/Excel
**So that** I can analyze or share the data externally

**Acceptance Criteria:**
- [x] Export button visible in admin dashboard
- [x] Button only enabled for premium users
- [x] CSV includes: Time Slot, Respondent Name, Available (Y/N)
- [x] Filename includes event name and date
- [x] Opens save dialog in browser
- [x] Works across all browsers

**Technical Notes:**
- Client-side CSV generation via `src/lib/csv-export.ts`
- Format: `"2025-01-15 9:00 AM", "Alice", "Yes"`
- 26 unit tests covering generation, formatting, escaping, and download
- Wired into admin dashboard at `/events/:eventId/admin/:adminToken`

---

## Epic 4: User Authentication & Accounts

### Story 4.1 - Sign Up with Email/Password [P1] ✅
**As a** user
**I want to** create an account with email and password
**So that** I can manage all my events in one place

**Acceptance Criteria:**
- [x] Sign up form accessible from homepage (via Clerk modal)
- [x] User enters email (validated)
- [x] User enters password (min 8 chars, strength indicator)
- [x] User enters name
- [x] Email verification sent after signup
- [x] User can click verification link to activate account
- [x] Account starts on free tier

**Technical Notes:**
- Implemented via Clerk (not Convex Auth / Better Auth as originally planned)
- Clerk handles password hashing, email verification, session management
- `getOrCreateUser` mutation creates user record with `subscriptionTier: 'free'` on first sign-in
- JWT verification configured in `convex/auth.config.ts`

---

### Story 4.2 - Sign In with OAuth (Google) [P2] ✅
**As a** user
**I want to** sign in with my Google account
**So that** I don't have to manage another password

**Acceptance Criteria:**
- [x] "Sign in with Google" button on login page
- [x] OAuth flow redirects to Google
- [x] User grants permissions
- [x] User redirected back to app
- [x] Account created automatically on first login
- [x] Subsequent logins use existing account

**Technical Notes:**
- Implemented via Clerk OAuth providers
- Google OAuth configured in Clerk dashboard
- Clerk handles the full OAuth flow and session management

---

### Story 4.3 - Dashboard - View All My Events [P1] ✅
**As a** registered user
**I want to** see a list of all events I've created
**So that** I can manage them in one place

**Acceptance Criteria:**
- [x] Dashboard shows table/list of events
- [x] Each event shows: title, date created, respondent count, status
- [x] User can click event to view detail page
- [x] User can toggle event status (active/inactive)
- [x] User can delete events
- [x] Search and filter by status (all/active/inactive)
- [x] Empty state shown if no events exist

**Technical Notes:**
- Query events by `creatorId = currentUser.subject` (Clerk subject ID)
- Include count of responses per event
- Route: `/my-events` for list, `/my-events/:eventId` for detail
- Ownership verified server-side for all mutations

---

### Story 4.4 - Claim Guest Events After Signup [P2] ❌
**As a** user who created events as a guest, then signed up
**I want to** claim those events under my account
**So that** I can manage them in my dashboard

**Acceptance Criteria:**
- [ ] During signup, prompt user if they have admin links to claim
- [ ] User can paste admin link(s)
- [ ] System associates those events with new user account
- [ ] Events now appear in user's dashboard
- [ ] Original admin links still work

**Technical Notes:**
- Update `creatorId` from `undefined` to `user.id`
- Validate admin token before claiming

---

## Epic 5: Premium Features & Monetization

### Story 5.1 - View Pricing Page [P1] ✅
**As a** user (guest or registered)
**I want to** see the premium features and pricing
**So that** I can decide if I want to upgrade

**Acceptance Criteria:**
- [x] Pricing page accessible from nav/footer
- [x] Clear comparison table: Free vs Premium
- [x] Monthly price displayed ($5/month)
- [x] List of premium features clearly shown
- [x] Call-to-action button to upgrade
- [x] Pricing page is responsive

**Technical Notes:**
- Route: `/pricing` with feature comparison table and FAQ section
- Uses `TIER_LIMITS` from `tier-config.ts` for dynamic limit display
- Handles Stripe checkout success/canceled URL params with toast notifications
- Sign-in prompt for unauthenticated users, "Manage Subscription" for existing subscribers

---

### Story 5.2 - Upgrade to Premium (Stripe Integration) [P1] ✅
**As a** registered user
**I want to** upgrade to premium via credit card
**So that** I can access premium features

**Acceptance Criteria:**
- [x] User clicks "Upgrade" button
- [x] Redirected to Stripe Checkout
- [x] User enters payment details
- [x] Payment processed securely
- [x] User redirected back to app
- [x] Account `subscriptionTier` updated to 'premium'
- [x] Premium features immediately accessible
- [x] Confirmation email sent (via Stripe)

**Technical Notes:**
- Stripe Checkout via `convex/stripe.ts` (`createCheckoutSession`, `createPortalSession`)
- Webhook handler in `convex/http.ts` handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- `useSubscription` hook manages client-side subscription state and actions
- Stripe Customer Portal for subscription management
- Requires env vars: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`

---

### Story 5.3 - Create Event with Custom Slot Duration [P1] [Premium] ⚠️
**As a** premium user
**I want to** set custom slot durations (e.g., 10min, 45min)
**So that** I can match my specific scheduling needs

**Acceptance Criteria:**
- [ ] Event creation form shows "Custom" option for slot duration
- [ ] User can enter any duration between 5-120 minutes
- [ ] Validation ensures reasonable values
- [x] Grid generates correctly with custom duration (backend ready)
- [ ] Feature disabled for free users (show upgrade prompt)

**Technical Notes:**
- Check `user.subscriptionTier === 'premium'`
- Database schema supports custom durations, UI not implemented

---

### Story 5.4 - Password-Protected Events [P1] [Premium] ✅
**As a** premium user
**I want to** password-protect my event
**So that** only invited people can respond

**Acceptance Criteria:**
- [x] Admin can set password during event creation
- [x] Password field shown only for premium users
- [x] Invitees must enter password before viewing event
- [x] Wrong password shows error message
- [x] Admin can change/remove password later
- [x] Password stored securely (hashed) - SHA-256 + random salt

**Technical Notes:**
- Password hashed with SHA-256 + 16-byte random salt, stored as `salt:hash` hex
- `convex/lib/password.ts` provides `hashPassword()` and `verifyPassword()`
- Password verified server-side on both query (`getByIdWithResponseCount`) and mutation (`responses.submit`)
- Admin page (via adminToken) and edit response page (via editToken) bypass password
- Free tier users see upgrade prompt instead of password field
- `PasswordGate` component provides full-page password entry UI

---

### Story 5.5 - Unlimited Date Range [P1] [Premium] ✅
**As a** premium user
**I want to** create events with unlimited date ranges
**So that** I can schedule long-term availability

**Acceptance Criteria:**
- [x] Free users limited to 14-day range (validation)
- [x] Premium tier config allows 365 days
- [x] Premium users can select extended range (tier enforcement via `useSubscription` + `TIER_LIMITS`)
- [x] Event creation form dynamically adjusts limits based on subscription tier
- [ ] Grid handles very large date ranges efficiently (untested at scale)

**Technical Notes:**
- Client-side enforcement in event creation form via `createEventSchemaForTier(tier)`
- `useSubscription` hook provides `isPremium` / `tier` to determine limits
- `TIER_LIMITS` in `tier-config.ts` defines: free=14 dates, premium=365 dates

---

### Story 5.6 - Ad-Free Experience [P1] [Premium] ❌
**As a** premium user
**I want to** use the app without ads
**So that** I have a cleaner experience

**Acceptance Criteria:**
- [ ] Ads displayed for free users on result pages
- [ ] No ads shown to premium users
- [ ] Ad placement doesn't disrupt UX
- [ ] Ads are responsive

**Technical Notes:**
- Conditional rendering: `{user.subscriptionTier === 'free' && <Ad />}`
- Use Google AdSense or similar

---

## Epic 6: Quality of Life & Enhancements

### Story 6.1 - Copy Links with One Click [P0] ✅
**As an** event creator
**I want to** copy the public and admin links with one click
**So that** I can quickly share them

**Acceptance Criteria:**
- [x] Copy button next to each link
- [x] Click copies link to clipboard
- [x] Visual feedback (checkmark, "Copied!" message)
- [x] Works on all browsers (fallback for older browsers)

**Technical Notes:**
- Uses Clipboard API: `navigator.clipboard.writeText()`

---

### Story 6.2 - Email Notification on New Response [P2] ❌
**As an** event creator
**I want to** receive email notifications when someone responds
**So that** I stay updated without checking the dashboard

**Acceptance Criteria:**
- [ ] Opt-in during event creation (checkbox)
- [ ] Email sent to creator when new response submitted
- [ ] Email includes respondent name and link to dashboard
- [ ] Email is well-formatted (HTML template)
- [ ] User can unsubscribe from notifications

**Technical Notes:**
- Requires creator email (only for registered users)
- Use transactional email service (Resend, SendGrid, etc.)

---

### Story 6.3 - Share Event on Social Media [P2] ❌
**As an** event creator
**I want to** share the public link on social media
**So that** I can reach more participants

**Acceptance Criteria:**
- [ ] Share buttons for Twitter, WhatsApp, Slack, Email
- [ ] Pre-filled share text includes event title and link
- [ ] Opens share dialog or native app
- [ ] Works on mobile and desktop

**Technical Notes:**
- Use Web Share API on mobile
- Fallback to URL schemes on desktop

---

### Story 6.4 - Duplicate Existing Event [P2] ❌
**As a** registered user
**I want to** duplicate an existing event
**So that** I can quickly create similar events

**Acceptance Criteria:**
- [ ] "Duplicate" button on event in dashboard
- [ ] Creates new event with same settings
- [ ] New title: "[Original Title] (Copy)"
- [ ] New unique links generated
- [ ] Responses are NOT copied
- [ ] User redirected to new event's admin page

**Technical Notes:**
- Copy event row, generate new IDs and tokens

---

### Story 6.5 - Dark Mode Support [P2] ✅
**As a** user
**I want to** switch between light and dark mode
**So that** I can use the app comfortably in different lighting

**Acceptance Criteria:**
- [x] Dark mode toggle in nav/settings
- [x] Entire app switches color scheme
- [x] Preference saved in localStorage
- [x] Respects system preference on first visit
- [x] All components styled for both modes

**Technical Notes:**
- Uses Tailwind `dark:` classes
- Theme provider with light/dark/system options

---

## Epic 7: Admin & Moderation

### Story 7.1 - Soft Delete Events (Archive) [P1] ⚠️
**As an** event creator
**I want to** archive old events instead of deleting them
**So that** I can keep them for reference without cluttering my dashboard

**Acceptance Criteria:**
- [x] "Deactivate" button on admin dashboard (toggles isActive flag)
- [ ] Archived events hidden from main dashboard
- [ ] Archived events accessible in "Archived" tab
- [x] User can restore deactivated events ("Activate" button)
- [x] Public link shows "no longer accepting responses" when deactivated

**Technical Notes:**
- Database fields `isActive` and `archivedAt` exist
- Toggle status via admin token implemented: `toggleStatusByAdminToken` mutation
- Full archive UI (separate tab, filtering) not yet implemented

---

### Story 7.2 - Hard Delete Event [P1] ✅
**As an** event creator
**I want to** permanently delete an event
**So that** I can remove it and all associated data

**Acceptance Criteria:**
- [x] "Delete" button with confirmation dialog
- [x] Warning shown: "This cannot be undone" with event title and response count
- [x] Event and all responses deleted from database
- [x] Public and admin links stop working (404)
- [x] Deleted events removed from dashboard

**Technical Notes:**
- `deleteByAdminToken` mutation cascades deletes to all responses
- Confirmation dialog shows event title and number of responses that will be deleted
- After deletion, user is redirected to homepage with success toast

---

## Epic 8: Analytics & Insights (Future Enhancement)

### Story 8.1 - View Event Statistics [P2] ⚠️
**As an** event creator
**I want to** see statistics about my event
**So that** I can understand engagement

**Acceptance Criteria:**
- [x] Dashboard shows total responses
- [x] Dashboard shows capacity percentage
- [x] Best available times highlighted in heatmap
- [ ] Chart showing responses over time
- [ ] Average response time
- [ ] Least available time slot highlighted

**Technical Notes:**
- Basic stats implemented, advanced analytics not yet

---

### Story 8.2 - Track Link Views [P2] ❌
**As an** event creator
**I want to** see how many people viewed the event link
**So that** I know if people are seeing my invitation

**Acceptance Criteria:**
- [ ] Track unique views of public link
- [ ] Display view count on admin dashboard
- [ ] Show views vs. responses ratio

**Technical Notes:**
- Add `views` counter to events table
- Increment on page load (with basic duplicate detection)

---

## Technical Debt & Infrastructure Stories

### Story T.1 - Database Setup [P0] ✅
**As a** developer
**I want to** have a reliable database with real-time capabilities
**So that** the app data is stored and synchronized

**Acceptance Criteria:**
- [x] Convex backend configured
- [x] Schema defined with proper types and indexes
- [x] Real-time subscriptions working
- [x] Mutations for create/update operations

**Technical Notes:**
- Using Convex instead of Drizzle/PostgreSQL (original plan)
- Schema in `/convex/schema.ts`
- Convex handles migrations automatically

---

### Story T.2 - Environment Variables Setup [P0] ✅
**As a** developer
**I want to** configure environment variables
**So that** the app works in different environments

**Required Variables:**
- `CONVEX_DEPLOYMENT` - Convex deployment identifier

**Future Variables (when features added):**
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- Auth provider credentials

---

### Story T.3 - Error Handling & Logging [P1] ⚠️
**As a** developer
**I want to** consistent error handling and logging
**So that** I can debug issues and monitor the app

**Acceptance Criteria:**
- [x] Components have try-catch blocks
- [x] Toast notifications for user-facing errors
- [x] Loading states and error boundaries
- [x] 404 Not Found component
- [ ] Centralized error logging with context
- [ ] Sentry or similar error tracking integrated
- [ ] Custom 500 error page

**Technical Notes:**
- Basic error handling in place
- Production error tracking not yet integrated

---

### Story T.4 - Testing Setup [P1] ⚠️
**As a** developer
**I want to** write and run tests
**So that** I can prevent regressions

**Acceptance Criteria:**
- [x] Unit tests for utility functions
- [x] Tests for Convex functions
- [x] `npm run test` command works
- [ ] Integration tests for API routes
- [ ] E2E tests for critical flows (event creation, response submission)
- [ ] Tests run in CI/CD pipeline
- [ ] Test coverage reports

**Tools:**
- Vitest (configured and working)
- Testing Library
- Playwright (for E2E - not yet set up)

---

## Implementation Summary

### Completed (P0 Core MVP + P1):
| Story | Description | Status |
|-------|-------------|--------|
| 1.1 | Guest event creation | ✅ |
| 1.2 | Admin dashboard via secret link | ✅ |
| 1.3 | Edit event details | ✅ |
| 2.1 | Respondent submission | ✅ |
| 2.2 | Edit response | ✅ |
| 2.3 | Mobile-responsive grid | ✅ |
| 3.1 | Results heatmap | ✅ |
| 3.2 | Hover for details | ✅ |
| 3.3 | CSV export (premium) | ✅ |
| 4.1 | Email/password auth (Clerk) | ✅ |
| 4.2 | OAuth Google (Clerk) | ✅ |
| 4.3 | My Events dashboard | ✅ |
| 5.1 | Pricing page | ✅ |
| 5.2 | Stripe integration | ✅ |
| 5.4 | Password protection (premium) | ✅ |
| 5.5 | Unlimited date range (premium) | ✅ |
| 6.1 | Copy links | ✅ |
| 6.5 | Dark mode | ✅ |
| 7.2 | Hard delete event (creator) | ✅ |
| T.1 | Database setup | ✅ |
| T.2 | Environment config | ✅ |

### Partially Implemented:
| Story | Description | Status | Notes |
|-------|-------------|--------|-------|
| 5.3 | Custom slot duration | ⚠️ | Schema ready, no UI |
| 7.1 | Archive events | ⚠️ | Schema ready, no UI |
| 8.1 | Event statistics | ⚠️ | Basic stats only |
| T.3 | Error handling | ⚠️ | Basic only, no Sentry/error tracking |
| T.4 | Testing | ⚠️ | 250 unit tests, no E2E or CI |

### Not Started:
| Story | Description | Priority |
|-------|-------------|----------|
| 4.4 | Claim guest events | P2 |
| 5.6 | Ad-free experience | P1 |
| 6.2 | Email notifications | P2 |
| 6.3 | Social media share | P2 |
| 6.4 | Duplicate event | P2 |
| 8.2 | Track link views | P2 |

---

**End of User Stories Document**
