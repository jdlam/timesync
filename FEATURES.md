# TimeSync - Implemented Features

This document lists all features currently implemented in TimeSync.

---

## Event Creation

- **Create Event Form** at `/events/create`
  - **Event mode chooser**: align on **Times** or **Dates** (see below)
  - Event title (required, validated)
  - Optional description/notes
  - Timezone selection with searchable dropdown (all IANA timezones)
  - Multi-date calendar picker (up to 14 dates for free tier)
  - Date chips sorted chronologically (oldest to newest)
  - Time range selection (start and end times) — *Times mode only*
  - Slot duration options (15, 30, or 60 minutes) — *Times mode only*
  - Form validation with clear error messages
  - Success dialog with public link and admin link
  - One-click copy for both links
  - Signed-in users: events linked to account (viewable in My Events)
  - Guest users: events accessible via admin link only

---

## Date-Only Events (Align on Days)

For coordinating on **which calendar days** work (e.g. planning a vacation)
rather than a time of day.

- **Event mode** chosen at creation: *Times* (the classic time-slot flow) or
  *Dates*. Existing events default to *Times*.
- **Selection pattern** chosen at creation: **Individual**, **Weekends**,
  **Weekdays**, or **Custom** (pick weekdays). Grouped patterns (anything but
  Individual) apply a recurring weekday shape across a range and split the
  candidate days into **blocks** (each weekend, each work-week, each Mon–Wed
  run). The creator can exclude specific blocks; responders toggle **whole
  blocks** instead of individual days; the admin ranks **best blocks**. Blocks
  are derived from contiguous runs of `dates` — nothing extra is stored.
  Components: `PatternRangePicker` (creator), `DateBlockSelector` (responder).
- **Individual pattern** uses the shared calendar picker (`DayPoolPicker`): an
  "Add multiple days" popover picks a range and filters it by weekday — one-tap
  **Weekends** / **Weekdays** / **All**, or individual weekday chips — plus an
  always-visible calendar to tap individual days.
- **Candidate day pool** (creator) defined via the range popover and/or
  individual days. **Responders** are limited to the candidate days and get a
  Select-all shortcut. Name + optional comment work the same as time-slot events.
- **Tier limit is span-based** (not day count): the pool may span at most **8
  weeks** (56 days from the first day) on free, up to a year on premium.
- **Admin results**: a calendar-style heatmap coloring each candidate day by
  overlap, with respondent popovers, a **Best Days** recommendation panel, and a
  **best consecutive stretch** ("N days in a row everyone is free").
- **CSV export** emits one row per candidate day.
- **Implementation**: each candidate date maps to one canonical midnight-in-
  timezone slot, so the existing heatmap/response/aggregation stack is reused
  unchanged. Stored via `events.eventMode` (`"times" | "dates"`).

---

## Availability Submission (Respondent Flow)

- **Event Response Page** at `/events/:eventId`
  - View event details (title, description, timezone, dates)
  - Interactive availability grid for selecting time slots
  - Click to toggle individual slots
  - Click and drag to select multiple slots
  - Shift+click for range selection
  - Touch support for mobile devices
  - Respondent name input (required)
  - Optional comment field
  - Submit response with success confirmation
  - Edit link provided after submission
  - Returning to the event page edits the response already submitted from this
    browser instead of creating a duplicate (which would consume another
    respondent slot). The edit token is remembered per event in `localStorage`
    under `response-${eventId}`
  - "Not <name>? Submit a new response" clears that memory, so a shared device
    isn't locked to one respondent
  - A remembered response that the admin has since deleted is forgotten
    automatically, returning the visitor to the submit form

- **Edit Response** at `/events/:eventId/edit/:editToken`
  - Retrieve existing response via edit token
  - Pre-filled selections from previous submission
  - Update name, comment, and availability
  - Toast notification on successful update
  - Shares the `EditResponseForm` component with the event page's edit mode

---

## Admin Dashboard

- **Admin Dashboard** at `/events/:eventId/admin/:adminToken`
  - Secure access via admin token (not guessable)
  - Admin badge indicator

### Edit Event

- **Edit Event Dialog** accessible via "Edit Event" button
  - Edit event title and description
  - Modify date selection with calendar picker
  - Change time range (start and end times)
  - Timezone displayed as read-only (cannot change after creation)
  - Slot duration displayed as read-only (would invalidate responses)
  - Warning banner when event has existing responses
  - Changes saved immediately with real-time updates
  - Form validation with clear error messages
  - Success/error toast notifications

### Event Management (Admin Token)

- **Toggle Event Status**: Deactivate/activate event via admin token
  - Deactivated events show "no longer accepting responses" to respondents
  - Re-activate to resume accepting responses
- **Delete Event**: Permanently delete event and all responses
  - Confirmation dialog shows event title and response count
  - Cascade deletes all associated responses
  - Redirects to homepage after deletion

### Statistics Section

- Total responses count
- Maximum respondents capacity
- Capacity percentage with visual indicator

### Link Sharing

- Public link for sharing with participants
- Admin link (private)
- One-click copy functionality with visual feedback

### Email Notifications

- Opt-in email notifications when a new response is submitted
- Available only for signed-in event creators
- Toggle on event creation form (default: checked for signed-in users)
- Toggle on event edit dialog for existing events
- Emails include respondent name, response count, and link to admin dashboard
- Delivered via lame-mail, a self-hosted transactional email service

### Branded Unsubscribe Portal

- **Unsubscribe Portal** at `/unsubscribe`
  - Branded portal with TimeSync logo and teal-emerald gradient
  - Reached from notification email footers via `?eventId=` and `?token=` query params
  - Confirmation screen before unsubscribing ("Stop email notifications for '{event title}'?") to prevent accidental opt-outs
  - Success screen after unsubscribing shows "You won't receive email notifications for '{event title}'"
  - Allows re-enabling notifications if unsubscribed
  - Token-authenticated with least-privilege notification token
  - Legacy admin-token links still supported for backward compatibility
  - Displays "You're unsubscribed" and "Notifications are back on" states with re-enable/disable toggles
  - Responsive design with centered card layout
  - Error handling with retry button for stale/invalid links

### Event Links Emailed on Creation

- After creating an event, the creator is emailed their public + admin links
- Signed-in creators receive it at their account email automatically
- Guests can enter an optional email on the create form to receive the links
- Email highlights that the admin link is private (it manages results)
- Silently skipped when lame-mail / `APP_URL` are not configured (event creation
  never fails because of email)

### Heatmap Visualization

- Color-coded availability grid (green = high availability, red = low)
- Shows count of available people per time slot
- **Best Available Times** section highlighting top 3 slots
- Click cells to view detailed popover:
  - Number available (e.g., "5 of 8 available")
  - Percentage availability
  - List of available respondents
- Color legend explaining the gradient
- Desktop table view with sticky time column
- Mobile accordion view with collapsible dates

### View Individual Response Availability

- Click a response card to highlight that person's selected slots
- Heatmap shows:
  - Teal checkmark for slots they selected
  - Dimmed/gray for slots they did not select
- "Viewing: [Name]" banner with "Show All" button
- Click same response or "Show All" to return to aggregate view
- Selected response card shows teal border and "Viewing" badge

### Responses List

- All responses displayed as cards
- Each card shows:
  - Respondent name
  - Optional comment
  - Number of slots selected
  - Submission timestamp
  - Update timestamp (if edited)
- Delete response with confirmation dialog
- Click response to filter heatmap (see above)

---

## Authentication (Clerk)

- **Sign In / Sign Out** buttons in header
- Email/password authentication
- OAuth providers (Google, etc.)
- Email verification on signup
- Integrated with Convex via JWT verification
- User button with account menu when signed in
- User record created automatically on first sign-in (`getOrCreateUser` mutation)

---

## Super Admin Dashboard

- **Super Admin Access** controlled via environment variable
- Only users with emails in `SUPER_ADMIN_EMAILS` can access
- **Super admins automatically have premium access** (no upgrade prompts shown)

### Security Features

- Unauthorized access attempts are logged server-side with user email and ID
- Production builds show generic "Access Denied" page without sensitive info
- Development builds show user email for debugging purposes
- Unauthorized users accessing admin sub-routes are redirected to `/admin`
- Browser history is sanitized (admin sub-routes don't appear in history)

### Dashboard (`/admin/dashboard`)

- Statistics overview:
  - Total events
  - Active/inactive events
  - Total responses
  - Events this week
  - Responses this week
- Recent events preview
- Quick action links

### Events Management (`/admin/events`)

- Searchable event list
- Filter by status (all/active/inactive)
- Pagination with "Load More"
- Actions per event:
  - View details
  - Toggle active/inactive status
  - Delete event (with confirmation)

### Event Details (`/admin/events/:eventId`)

- Full event configuration view
- List of all responses
- Delete individual responses
- Toggle event status
- Link to public event page

### Responses Management (`/admin/responses`)

- View all responses across all events
- Search by respondent name
- Delete responses with confirmation
- Shows associated event info

### Audit Logs (`/admin/logs`)

- Track all admin actions
- Logged actions: delete event, delete response, toggle status
- Shows who, what, when, and target details
- Paginated chronological list

---

## My Events Dashboard

- **My Events List** at `/my-events`
  - Accessible to signed-in users via header navigation
  - Shows all events created by the current user
  - Table/card view with event details:
    - Title and description
    - Created date
    - Response count
    - Status (Active/Inactive)
  - Search events by title or description
  - Filter by status (All/Active/Inactive)
  - Pagination with "Load More"
  - Empty state with link to create first event

- **My Event Detail** at `/my-events/:eventId`
  - Event configuration overview (dates, time range, slot duration)
  - List of all responses with names and slot counts
  - Toggle event status (active/inactive)
  - Delete event with confirmation dialog
  - Link to view public event page

- **Event Ownership**
  - Events created while signed in are linked to user's Clerk ID
  - Guest-created events have no owner (creatorId undefined)
  - Ownership verified server-side for all mutations
  - Users cannot access other users' events

---

## Pricing & Subscription (Stripe)

- **Pricing Page** at `/pricing`
  - Free vs Premium comparison table
  - Feature breakdown with check/cross icons
  - FAQ section
  - Dynamic limits from `TIER_LIMITS` configuration
  - Responsive design

- **Stripe Checkout Integration**
  - "Upgrade to Premium" button for signed-in users
  - "Sign in to Upgrade" prompt for guests
  - Redirect to Stripe Checkout for payment
  - Success/canceled URL handling with toast notifications
  - Webhook handler for subscription lifecycle events:
    - `checkout.session.completed` - activates premium
    - `customer.subscription.updated` - syncs status changes
    - `customer.subscription.deleted` - reverts to free
    - `invoice.payment_failed` - logged for monitoring

- **Subscription Management**
  - Stripe Customer Portal for managing subscription
  - `useSubscription` hook for client-side subscription state
  - Real-time tier enforcement in event creation
  - Super admins automatically have premium access

---

## Password Protection (Premium)

- **Event Password Protection** for premium users
  - Optional password field during event creation
  - Password hashed server-side with PBKDF2-HMAC-SHA256 + random salt
  - Respondents see a password gate before accessing the event
  - Wrong password shows clear error message
  - Password verified on both query and response submission (server-side)
  - Admin can change or remove password via edit dialog
  - Admin page (adminToken) and edit response page (editToken) bypass password
  - Free tier users see an upgrade prompt instead of password input
  - "Password Protected" badge shown in event header
  - `PasswordGate` component provides centered, mobile-friendly password entry UI
  - `convex/lib/password.ts` provides hashing/verification utilities

---

## CSV Export (Premium)

- **Export Results to CSV** from admin dashboard
  - Export button in admin dashboard (premium users only)
  - CSV format: Time Slot, Respondent Name, Available (Yes/No)
  - Filename includes event title and export date
  - Proper CSV escaping for commas, quotes, and line breaks
  - Client-side generation via `src/lib/csv-export.ts`

---

## Theme System

- **Light / Dark / System** theme options
- Toggle accessible from header
- Persisted in localStorage
- Syncs across browser tabs
- Respects system color scheme preference
- All components styled for both modes

---

## Responsive Design

- Mobile-first responsive layout
- Desktop: Table view for availability grid
- Mobile: Accordion view with collapsible date sections
- Touch-friendly interactions
- Mobile sidebar navigation
- Adaptive grid sizing

---

## Branding & Logo

- **"Shaken Hourglass" Logo** — Tilted hourglass with motion lines, teal-to-emerald gradient
  - Reusable `<Logo>` SVG component (`src/components/Logo.tsx`)
  - Props: `size` (default 32), `showMotionLines` (auto-hidden below 32px), `className`
  - Unique gradient IDs via `React.useId()` (safe for multiple instances)
  - SVG source files in `src/assets/` (full and simplified variants)
- **Brand gradient**: `from-teal-500 to-emerald-500` (header, hero, admin/my-events layouts)
- **Meta tags**: description, Open Graph, Twitter Card
- **Favicon & PWA icons**: Generated from SVG source (16, 32, 180, 192, 512px)
- **Manifest files**: Proper TimeSync branding in `manifest.json` and `site.webmanifest`
- **Brand kit reference**: `.ai/brand-kit.html` (open in browser for visual reference)

---

## Landing Page

- Hero section with call-to-action
- Feature showcase cards
- "How it works" step-by-step guide
- Footer with app description
- Responsive design

---

## Error Handling & UX

- **Not Found Page** for invalid event/admin links
- Toast notifications for success/error messages
- Form validation with inline error messages
- Loading states with spinners
- Confirmation dialogs for destructive actions

---

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- Semantic HTML structure
- Focus management
- Screen reader friendly cell labels

---

## Backend (Convex)

### Events

- Create event with full configuration
- Fetch event by ID (with active status check)
- Fetch event by admin token (secure admin access)
- Get event with response count
- Toggle event status via admin token
- Delete event (with cascade delete of responses) via admin token

### Responses

- Submit new response (validates max respondents)
- Update existing response via edit token
- Delete response
- Fetch all responses for an event
- Count responses per event

### Users & Subscriptions

- Get or create user record on sign-in
- Query current user subscription status
- Stripe checkout session creation
- Stripe customer portal session creation
- Webhook handler for subscription lifecycle events
- Super admin detection via environment variable

---

## Tier Configuration

### Free Tier

- Up to 5 participants per event
- Up to 14 dates
- Standard slot durations (15, 30, 60 min)

### Premium Tier

- Unlimited participants
- Up to 365 dates
- CSV export
- Password protection
- Tier enforcement active in event creation form via `useSubscription` hook

---

## Utilities

- **Time utilities**: Generate slots, parse/format times, timezone handling
- **Heatmap utilities**: Calculate availability percentages, color gradients
- **Token utilities**: Generate secure tokens for admin/edit links
- **Validation schemas**: Zod schemas for form validation (tier-aware)
- **CSV export**: Generate and download CSV files with proper escaping
- **Tier configuration**: Free/premium limits and feature flags
- **Analytics**: Umami analytics integration

---

## Tech Stack

- **Frontend**: React, TanStack Router, TanStack Form, Tailwind CSS
- **Backend**: Convex (real-time database and functions)
- **Authentication**: Clerk (OAuth, JWT verification)
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS with dark mode support
- **Testing**: Vitest
