# TimeSync - User Stories

**Version:** 1.0
**Based on PRD:** Version 1.0

---

## Story Priority Legend
- **P0** - Critical path, must-have for MVP
- **P1** - Important, should have for launch
- **P2** - Nice to have, can be added post-launch

---

## Epic 1: Guest Event Creation (No Auth)

### Story 1.1 - Create Event as Guest User [P0]
**As a** guest user (not logged in)
**I want to** create a scheduling event without signing up
**So that** I can quickly coordinate with my group without friction

**Acceptance Criteria:**
- [ ] User can access event creation form from homepage
- [ ] User can enter event title (required, max 255 chars)
- [ ] User can enter optional description (text area)
- [ ] User can select timezone from dropdown (defaults to browser timezone)
- [ ] User can choose slot duration: 15min, 30min, or 60min
- [ ] User can select date range (max 14 days for free tier)
- [ ] User can set time range (e.g., 9:00 AM - 5:00 PM)
- [ ] System generates unique public link (shareable)
- [ ] System generates unique admin link (secret, for creator only)
- [ ] Both links are displayed prominently after creation
- [ ] User can copy both links with one-click copy buttons
- [ ] Event is created without requiring authentication

**Technical Notes:**
- Admin link uses `adminToken` (UUID) for access
- Store creator as `null` in `creatorId` field
- Default `maxRespondents` to 20

---

### Story 1.2 - Access Admin Dashboard via Secret Link [P0]
**As a** guest event creator
**I want to** access my event's admin dashboard using the secret link
**So that** I can view responses and manage the event without logging in

**Acceptance Criteria:**
- [ ] User can access admin dashboard by clicking admin link
- [ ] URL contains unique admin token (not guessable)
- [ ] Dashboard shows event details (title, dates, time range)
- [ ] Dashboard shows all respondent availability
- [ ] Dashboard shows heatmap visualization
- [ ] User can see who responded
- [ ] User can edit event details
- [ ] User can archive/delete the event
- [ ] Link works on any device/browser (not cookie-based)

**Technical Notes:**
- Validate `adminToken` in URL against database
- No session storage required
- Token should be sufficiently long to prevent brute force

---

### Story 1.3 - Edit Event Details (Admin) [P1]
**As an** event creator (guest or registered)
**I want to** edit my event details after creation
**So that** I can fix mistakes or update information

**Acceptance Criteria:**
- [ ] Admin can edit event title
- [ ] Admin can edit description
- [ ] Admin can modify date range (within tier limits)
- [ ] Admin can modify time range
- [ ] Admin cannot change slot duration (would invalidate existing responses)
- [ ] Changes are saved immediately
- [ ] Updated event reflects changes for all invitees
- [ ] Warning shown if changes affect existing responses

**Technical Notes:**
- Prevent changing `slotDuration` after responses exist
- Update `updatedAt` timestamp

---

## Epic 2: Respondent Experience (Invitee Flow)

### Story 2.1 - View Event and Submit Availability [P0]
**As an** invitee (respondent)
**I want to** view the event details and select my availability
**So that** I can indicate when I'm free without creating an account

**Acceptance Criteria:**
- [ ] User accesses event via public link
- [ ] Event title and description are clearly displayed
- [ ] Date range and time slots are visible
- [ ] Grid shows all available time slots
- [ ] User enters their name (required)
- [ ] User can optionally add a comment
- [ ] User can click/tap cells to mark availability (green)
- [ ] User can click/tap again to unmark (gray)
- [ ] Desktop: Click and drag to paint multiple cells
- [ ] Mobile: Tap individual cells (responsive grid)
- [ ] Submit button saves their response
- [ ] Success message shown after submission
- [ ] User receives edit link to modify response later

**Technical Notes:**
- Generate unique `editToken` on submission
- Store selections as array of ISO timestamps in `selectedSlots`
- No authentication required

---

### Story 2.2 - Edit Response Using Edit Link [P1]
**As a** respondent
**I want to** edit my availability after submitting
**So that** I can update my schedule if it changes

**Acceptance Criteria:**
- [ ] User clicks edit link received after initial submission
- [ ] Previous selections are pre-filled in grid
- [ ] User can modify selections (add/remove time slots)
- [ ] User can update their name
- [ ] User can update their comment
- [ ] Submit updates the existing response (doesn't create duplicate)
- [ ] Updated response reflects immediately in admin dashboard

**Technical Notes:**
- Use `editToken` to identify and update existing response
- Update `updatedAt` timestamp

---

### Story 2.3 - Mobile-Responsive Availability Grid [P0]
**As an** invitee on mobile
**I want to** easily select my availability on a small screen
**So that** I can respond without pinching/zooming

**Acceptance Criteria:**
- [ ] Grid automatically adapts to mobile viewport
- [ ] Days scroll horizontally if needed
- [ ] Time slots are large enough to tap accurately (min 44x44px)
- [ ] Horizontal scroll indicator shows if more dates exist
- [ ] Alternative: Switch to list view on mobile
- [ ] Selection works smoothly without lag
- [ ] Visual feedback on tap (immediate color change)

**Technical Notes:**
- Consider CSS Grid with `overflow-x: auto`
- Or implement column virtualization for many dates
- Test on iOS Safari and Chrome Android

---

## Epic 3: Results Visualization & Heatmap

### Story 3.1 - View Results Heatmap [P0]
**As an** event creator
**I want to** see a heatmap of all availability
**So that** I can quickly identify the best meeting times

**Acceptance Criteria:**
- [ ] Admin dashboard shows grid with all time slots
- [ ] Cell opacity/color represents overlap percentage
- [ ] 100% overlap = Dark Green
- [ ] 0% overlap = Light Gray or Red
- [ ] Gradual color scale for percentages in between
- [ ] Legend explains color coding
- [ ] Best times are visually obvious at a glance

**Technical Notes:**
- Calculate: `overlap_score = (count_available / total_respondents) * 100`
- Use HSL color interpolation for smooth gradient

---

### Story 3.2 - Hover to See Respondent Details [P0]
**As an** event creator
**I want to** hover over a time slot to see who's available
**So that** I can understand the breakdown beyond just the percentage

**Acceptance Criteria:**
- [ ] Hovering over a cell shows tooltip/popover
- [ ] Tooltip lists names of available respondents
- [ ] Tooltip shows count (e.g., "5 of 8 available")
- [ ] Works on desktop (hover)
- [ ] Works on mobile (long-press or tap-hold)
- [ ] Tooltip doesn't obscure other cells

**Technical Notes:**
- Use Radix UI Popover or Tooltip component
- Position tooltip dynamically to stay in viewport

---

### Story 3.3 - Export Results to CSV [P1] [Premium]
**As a** premium event creator
**I want to** export the results to CSV/Excel
**So that** I can analyze or share the data externally

**Acceptance Criteria:**
- [ ] Export button visible in admin dashboard
- [ ] Button only enabled for premium users
- [ ] CSV includes: Time Slot, Respondent Name, Available (Y/N)
- [ ] Filename includes event name and date
- [ ] Opens save dialog in browser
- [ ] Works across all browsers

**Technical Notes:**
- Generate CSV client-side or server-side
- Format: `"2023-10-27 10:00 AM", "Alice", "Yes"`

---

## Epic 4: User Authentication & Accounts

### Story 4.1 - Sign Up with Email/Password [P1]
**As a** user
**I want to** create an account with email and password
**So that** I can manage all my events in one place

**Acceptance Criteria:**
- [ ] Sign up form accessible from homepage
- [ ] User enters email (validated)
- [ ] User enters password (min 8 chars, strength indicator)
- [ ] User enters name
- [ ] Email verification sent after signup
- [ ] User can click verification link to activate account
- [ ] Account starts on free tier

**Technical Notes:**
- Use Better Auth for authentication
- Hash passwords with bcrypt
- Send verification email via email service

---

### Story 4.2 - Sign In with OAuth (Google) [P2]
**As a** user
**I want to** sign in with my Google account
**So that** I don't have to manage another password

**Acceptance Criteria:**
- [ ] "Sign in with Google" button on login page
- [ ] OAuth flow redirects to Google
- [ ] User grants permissions
- [ ] User redirected back to app
- [ ] Account created automatically on first login
- [ ] Subsequent logins use existing account

**Technical Notes:**
- Configure Google OAuth 2.0 credentials
- Use Better Auth OAuth plugin

---

### Story 4.3 - Dashboard - View All My Events [P0]
**As a** registered user
**I want to** see a list of all events I've created
**So that** I can manage them in one place

**Acceptance Criteria:**
- [ ] Dashboard shows table/list of events
- [ ] Each event shows: title, date created, respondent count, status
- [ ] User can click event to view admin page
- [ ] User can archive events
- [ ] User can delete events
- [ ] Archived events shown in separate section
- [ ] Empty state shown if no events exist

**Technical Notes:**
- Query events by `creatorId = currentUser.id`
- Include count of responses per event

---

### Story 4.4 - Claim Guest Events After Signup [P2]
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
- Update `creatorId` from `null` to `user.id`
- Validate admin token before claiming

---

## Epic 5: Premium Features & Monetization

### Story 5.1 - View Pricing Page [P1]
**As a** user (guest or registered)
**I want to** see the premium features and pricing
**So that** I can decide if I want to upgrade

**Acceptance Criteria:**
- [ ] Pricing page accessible from nav/footer
- [ ] Clear comparison table: Free vs Premium
- [ ] Monthly price displayed ($5/month)
- [ ] List of premium features clearly shown
- [ ] Call-to-action button to upgrade
- [ ] Pricing page is responsive

**Technical Notes:**
- Static page, no dynamic pricing needed initially

---

### Story 5.2 - Upgrade to Premium (Stripe Integration) [P1]
**As a** registered user
**I want to** upgrade to premium via credit card
**So that** I can access premium features

**Acceptance Criteria:**
- [ ] User clicks "Upgrade" button
- [ ] Redirected to Stripe Checkout
- [ ] User enters payment details
- [ ] Payment processed securely
- [ ] User redirected back to app
- [ ] Account `subscriptionTier` updated to 'premium'
- [ ] Premium features immediately accessible
- [ ] Confirmation email sent

**Technical Notes:**
- Use Stripe Checkout for payment
- Webhook to update subscription status
- Store Stripe `subscriptionId` in database

---

### Story 5.3 - Create Event with Custom Slot Duration [P1] [Premium]
**As a** premium user
**I want to** set custom slot durations (e.g., 10min, 45min)
**So that** I can match my specific scheduling needs

**Acceptance Criteria:**
- [ ] Event creation form shows "Custom" option for slot duration
- [ ] User can enter any duration between 5-120 minutes
- [ ] Validation ensures reasonable values
- [ ] Grid generates correctly with custom duration
- [ ] Feature disabled for free users (show upgrade prompt)

**Technical Notes:**
- Check `user.subscriptionTier === 'premium'`

---

### Story 5.4 - Password-Protected Events [P1] [Premium]
**As a** premium user
**I want to** password-protect my event
**So that** only invited people can respond

**Acceptance Criteria:**
- [ ] Admin can set password during event creation
- [ ] Password field shown only for premium users
- [ ] Invitees must enter password before viewing event
- [ ] Wrong password shows error message
- [ ] Admin can change/remove password later
- [ ] Password stored securely (hashed)

**Technical Notes:**
- Hash password before storing
- Implement password verification on event access

---

### Story 5.5 - Unlimited Date Range [P1] [Premium]
**As a** premium user
**I want to** create events with unlimited date ranges
**So that** I can schedule long-term availability

**Acceptance Criteria:**
- [ ] Free users limited to 14-day range (validation)
- [ ] Premium users can select any range
- [ ] Warning shown if range is very large (performance)
- [ ] Grid handles large date ranges efficiently

**Technical Notes:**
- Client-side and server-side validation
- Consider pagination or virtualization for large ranges

---

### Story 5.6 - Ad-Free Experience [P1] [Premium]
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

### Story 6.1 - Copy Links with One Click [P0]
**As an** event creator
**I want to** copy the public and admin links with one click
**So that** I can quickly share them

**Acceptance Criteria:**
- [ ] Copy button next to each link
- [ ] Click copies link to clipboard
- [ ] Visual feedback (checkmark, "Copied!" message)
- [ ] Works on all browsers (fallback for older browsers)

**Technical Notes:**
- Use Clipboard API: `navigator.clipboard.writeText()`

---

### Story 6.2 - Email Notification on New Response [P2]
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
- Use transactional email service

---

### Story 6.3 - Share Event on Social Media [P2]
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

### Story 6.4 - Duplicate Existing Event [P2]
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

### Story 6.5 - Dark Mode Support [P2]
**As a** user
**I want to** switch between light and dark mode
**So that** I can use the app comfortably in different lighting

**Acceptance Criteria:**
- [ ] Dark mode toggle in nav/settings
- [ ] Entire app switches color scheme
- [ ] Preference saved in localStorage
- [ ] Respects system preference on first visit
- [ ] All components styled for both modes

**Technical Notes:**
- Use Tailwind `dark:` classes
- Store preference: `localStorage.setItem('theme', 'dark')`

---

## Epic 7: Admin & Moderation

### Story 7.1 - Soft Delete Events (Archive) [P1]
**As an** event creator
**I want to** archive old events instead of deleting them
**So that** I can keep them for reference without cluttering my dashboard

**Acceptance Criteria:**
- [ ] "Archive" button on admin dashboard
- [ ] Archived events hidden from main dashboard
- [ ] Archived events accessible in "Archived" tab
- [ ] User can restore archived events
- [ ] Public link still works (read-only mode optional)

**Technical Notes:**
- Set `isActive = false` and `archivedAt = now()`
- Filter active events: `WHERE isActive = true`

---

### Story 7.2 - Hard Delete Event [P1]
**As an** event creator
**I want to** permanently delete an event
**So that** I can remove it and all associated data

**Acceptance Criteria:**
- [ ] "Delete" button with confirmation dialog
- [ ] Warning shown: "This cannot be undone"
- [ ] Event and all responses deleted from database
- [ ] Public and admin links stop working (404)
- [ ] Deleted events removed from dashboard

**Technical Notes:**
- Cascade delete responses: `onDelete: 'cascade'`

---

## Epic 8: Analytics & Insights (Future Enhancement)

### Story 8.1 - View Event Statistics [P2]
**As an** event creator
**I want to** see statistics about my event
**So that** I can understand engagement

**Acceptance Criteria:**
- [ ] Dashboard shows: total responses, response rate, avg response time
- [ ] Chart showing responses over time
- [ ] Most popular time slot highlighted
- [ ] Least available time slot highlighted

**Technical Notes:**
- Aggregate queries on responses table

---

### Story 8.2 - Track Link Views [P2]
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

### Story T.1 - Database Migrations Setup [P0]
**As a** developer
**I want to** generate and run database migrations
**So that** the database schema stays in sync with the code

**Acceptance Criteria:**
- [ ] Drizzle Kit configured correctly
- [ ] Migration scripts can be generated
- [ ] Migrations can be applied to development DB
- [ ] Migrations can be applied to production DB
- [ ] Migration history tracked

**Commands:**
```bash
npm run db:generate  # Generate migration
npm run db:migrate   # Apply migration
```

---

### Story T.2 - Environment Variables Setup [P0]
**As a** developer
**I want to** configure environment variables
**So that** the app works in different environments

**Required Variables:**
- `DATABASE_URL` - Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Secret for auth sessions
- `BETTER_AUTH_URL` - App base URL
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret

---

### Story T.3 - Error Handling & Logging [P1]
**As a** developer
**I want to** consistent error handling and logging
**So that** I can debug issues and monitor the app

**Acceptance Criteria:**
- [ ] All API routes have try-catch blocks
- [ ] Errors logged with context (user, action, timestamp)
- [ ] User-friendly error messages shown in UI
- [ ] 404, 500 error pages designed
- [ ] Sentry or similar error tracking integrated

---

### Story T.4 - Testing Setup [P1]
**As a** developer
**I want to** write and run tests
**So that** I can prevent regressions

**Acceptance Criteria:**
- [ ] Unit tests for utility functions
- [ ] Integration tests for API routes
- [ ] E2E tests for critical flows (event creation, response submission)
- [ ] Tests run in CI/CD pipeline

**Tools:**
- Vitest (already configured)
- Testing Library
- Playwright (for E2E)

---

## MVP Scope Summary

**Must-Have for MVP (P0 Stories):**
1. Guest event creation (1.1)
2. Admin dashboard via secret link (1.2)
3. Respondent submission flow (2.1)
4. Mobile-responsive grid (2.3)
5. Results heatmap (3.1)
6. Hover to see details (3.2)
7. User dashboard (4.3)
8. Copy links easily (6.1)
9. Database setup (T.1)
10. Environment config (T.2)

**Post-MVP (P1 & P2):**
- Edit events, premium features, OAuth, analytics, etc.

---

**End of User Stories Document**
