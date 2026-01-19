# TimeSync - Implemented Features

This document lists all features currently implemented in TimeSync.

---

## Event Creation

- **Create Event Form** at `/events/create`
  - Event title (required, validated)
  - Optional description/notes
  - Timezone selection with searchable dropdown (all IANA timezones)
  - Multi-date calendar picker (up to 14 dates for free tier)
  - Time range selection (start and end times)
  - Slot duration options (15, 30, or 60 minutes)
  - Form validation with clear error messages
  - Success dialog with public link and admin link
  - One-click copy for both links

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

- **Edit Response** at `/events/:eventId/edit/:editToken`
  - Retrieve existing response via edit token
  - Pre-filled selections from previous submission
  - Update name, comment, and availability
  - Toast notification on successful update

---

## Admin Dashboard

- **Admin Dashboard** at `/events/:eventId/admin/:adminToken`
  - Secure access via admin token (not guessable)
  - Admin badge indicator

### Statistics Section

- Total responses count
- Maximum respondents capacity
- Capacity percentage with visual indicator

### Link Sharing

- Public link for sharing with participants
- Admin link (private)
- One-click copy functionality with visual feedback

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
  - Cyan checkmark for slots they selected
  - Dimmed/gray for slots they did not select
- "Viewing: [Name]" banner with "Show All" button
- Click same response or "Show All" to return to aggregate view
- Selected response card shows cyan border and "Viewing" badge

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
- OAuth providers (Google, etc.)
- Integrated with Convex via JWT verification
- User button with account menu when signed in

---

## Super Admin Dashboard

- **Super Admin Access** controlled via environment variable
- Only users with emails in `SUPER_ADMIN_EMAILS` can access

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

### Responses

- Submit new response (validates max respondents)
- Update existing response via edit token
- Delete response
- Fetch all responses for an event
- Count responses per event

---

## Tier Configuration

### Free Tier

- Up to 20 participants per event
- Up to 14 dates
- Standard slot durations (15, 30, 60 min)

### Premium Tier (Planned)

- Unlimited participants
- Up to 365 dates
- Custom slot durations
- Password protection
- Custom branding

---

## Utilities

- **Time utilities**: Generate slots, parse/format times, timezone handling
- **Heatmap utilities**: Calculate availability percentages, color gradients
- **Token utilities**: Generate secure tokens for admin/edit links
- **Validation schemas**: Zod schemas for form validation

---

## Tech Stack

- **Frontend**: React, TanStack Router, TanStack Form, Tailwind CSS
- **Backend**: Convex (real-time database and functions)
- **Authentication**: Clerk (OAuth, JWT verification)
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS with dark mode support
- **Testing**: Vitest
