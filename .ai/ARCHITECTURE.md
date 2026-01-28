# TimeSync Architecture

This document provides a comprehensive overview of the TimeSync codebase architecture and code flows for AI agents.

## Diagrams

All diagrams are stored as `.mmd` files in the `diagrams/` directory for better tooling and reusability.

| Diagram | File | Description |
|---------|------|-------------|
| High-Level Architecture | [`diagrams/architecture.mmd`](diagrams/architecture.mmd) | Complete system overview with all routes, Convex functions, and database connections |
| Event Creation | [`diagrams/event-creation.mmd`](diagrams/event-creation.mmd) | Sequence diagram for creating a new event |
| Response Submission | [`diagrams/response-submission.mmd`](diagrams/response-submission.mmd) | Sequence diagram for submitting availability |
| Heatmap Visualization | [`diagrams/heatmap-visualization.mmd`](diagrams/heatmap-visualization.mmd) | Sequence diagram for rendering the heatmap |
| Auth Flow | [`diagrams/auth-flow.mmd`](diagrams/auth-flow.mmd) | Authentication and authorization levels |

### Viewing Diagrams

**IDE Extensions:**
- VS Code: [Mermaid Preview](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid)
- JetBrains: Built-in mermaid support

**CLI:**
```bash
# Install mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# Generate SVG
mmdc -i diagrams/architecture.mmd -o diagrams/architecture.svg

# Generate PNG
mmdc -i diagrams/architecture.mmd -o diagrams/architecture.png
```

**Online:**
- Paste contents into [mermaid.live](https://mermaid.live)

---

## Database Schema

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| **users** | Registered accounts | clerkId, email, subscriptionTier, stripeCustomerId |
| **events** | Scheduling events | adminToken, title, dates, timeRange, slotDuration, maxRespondents, isPremium, isActive, creatorId |
| **responses** | Availability submissions | eventId, respondentName, selectedSlots, editToken, comment |
| **auditLogs** | Admin action tracking | userId, action, targetType, targetId, metadata |

## Code Flow Summary

| Flow | Entry Point | Key Functions | Database Tables |
|------|-------------|---------------|-----------------|
| **Event Creation** | `/events/create` | `events.create`, `generateAdminToken` | events, users |
| **Response Submission** | `/events/$eventId` | `responses.submit`, `generateEditToken` | responses, events |
| **Response Editing** | `/events/$eventId/edit/$token` | `responses.getByEditToken`, `responses.update` | responses |
| **Heatmap View** | `/events/$eventId/admin/$token` | `responses.getByEventId`, `calculateHeatmap` | events, responses |
| **My Events** | `/my-events` | `myEvents.getMyEvents`, `myEvents.delete` | events, responses |
| **Super Admin** | `/admin/*` | `admin.checkAccess`, `admin.getStats` | all tables + auditLogs |

## File Organization

```
src/
├── routes/                    # TanStack Router file-based routing
│   ├── __root.tsx            # Root layout, theme, header
│   ├── index.tsx             # Landing page
│   ├── pricing.tsx           # Pricing page
│   ├── events/
│   │   ├── create.tsx        # Event creation
│   │   └── $eventId/
│   │       ├── index.tsx     # Public event view
│   │       ├── admin/$adminToken.tsx  # Admin dashboard
│   │       └── edit/$editToken.tsx    # Edit response
│   ├── my-events/
│   │   ├── index.tsx         # User's events list
│   │   └── $eventId.tsx      # User's event details
│   └── admin/
│       ├── index.tsx         # Admin redirect
│       ├── dashboard.tsx     # Stats & overview
│       ├── events/           # Event management
│       ├── responses.tsx     # Response management
│       └── logs.tsx          # Audit logs
├── components/
│   ├── availability-grid/    # Slot selection components
│   ├── heatmap/              # Heatmap visualization
│   ├── admin/                # Admin dashboard components
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── time-utils.ts         # Time slot generation/formatting
│   ├── heatmap-utils.ts      # Heatmap calculations
│   ├── token-utils.ts        # Token generation
│   ├── timezone-display.ts   # Timezone context
│   └── validation-schemas.ts # Zod schemas
└── hooks/
    └── useSubscription.ts    # Premium tier checking

convex/
├── schema.ts                 # Database schema (source of truth)
├── events.ts                 # Event queries/mutations
├── responses.ts              # Response queries/mutations
├── users.ts                  # User queries/mutations
├── myEvents.ts               # User-owned events
├── admin.ts                  # Super admin queries/mutations
├── stripe.ts                 # Stripe integration
└── lib/
    └── auth.ts               # Authentication utilities
```

## Key Patterns

### Token-Based Access
- **adminToken**: Generated at event creation, grants full event management access
- **editToken**: Generated at response submission, allows editing that response
- Tokens are cryptographically random, stored in database, verified on each request

### Real-Time Updates
- All Convex queries are real-time subscriptions
- Data automatically updates across all connected clients
- No manual refresh needed for collaborative scheduling

### Timezone Handling
- Events store timezone configuration
- All slots stored as ISO 8601 timestamps (UTC)
- Display timezone can differ from event timezone
- Day offset shown when viewing in different timezone
