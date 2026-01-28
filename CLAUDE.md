# CLAUDE.md - Guidelines for Claude

This file provides context and guidelines for Claude (AI assistant) when working on the TimeSync codebase.

## Project Overview

TimeSync is a modern scheduling app for coordinating group availability. Users can create events, share links, and find the best meeting times using an interactive heatmap visualization.

**Key Principle**: No account required for core functionality. Guest users can create events and submit availability.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TanStack Router, TanStack Form |
| Backend | Convex (real-time database + serverless functions) |
| Authentication | Clerk |
| Styling | Tailwind CSS v4, shadcn/ui components |
| Validation | Zod |
| Date Handling | date-fns, date-fns-tz |
| Testing | Vitest, Testing Library, convex-test |
| Linting | Biome (not ESLint/Prettier) |

## Project Structure

```
src/
├── components/           # React components
│   ├── admin/               # Super admin dashboard components
│   ├── availability-grid/   # Availability selection grid
│   ├── heatmap/             # Heatmap visualization
│   └── ui/                  # shadcn/ui components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and helpers
└── routes/               # TanStack Router file-based routing
    └── admin/               # Super admin dashboard routes

convex/
├── schema.ts             # Database schema (source of truth)
├── events.ts             # Event queries/mutations
├── responses.ts          # Response queries/mutations
├── admin.ts              # Super admin queries/mutations
├── auth.config.ts        # Clerk JWT verification config
└── lib/
    └── auth.ts           # Authentication utilities
```

## Commands

```bash
npm run dev          # Start frontend + Convex backend
npm run test         # Run tests with Vitest
npm run typecheck    # TypeScript checking
npm run check        # Biome lint + format check
npm run build        # Production build
```

## Git Conventions

### Commit & PR Title Format

Use this format for commit messages and PR titles:

```
<Type>: <Short description>
```

**Types:**
| Type | Use For |
|------|---------|
| `Feat` | New features or functionality |
| `Bug` | Bug fixes |
| `Refactor` | Code refactoring (no behavior change) |
| `Docs` | Documentation updates |
| `Test` | Adding or updating tests |
| `Chore` | Maintenance, dependencies, config |
| `Style` | Formatting, styling changes |

**Examples:**
```
Feat: Admin can see individual response's selections
Bug: Multi-select fix
Refactor: Extract heatmap calculation to utility
Docs: Update README with deployment instructions
Test: Add unit tests for time-utils
Chore: Update Convex to v1.32
```

**Guidelines:**
- Keep titles concise (50 chars or less ideal)
- Use sentence case after the colon
- No period at the end
- Be specific about what changed

### Branch Naming

```
<username>/<type>-<short-description>
```

**Examples:**
```
jlam/feat-admin-view-response
jlam/bug-multiselect-fix
```

## Design Philosophy

### Mobile-First Priority

**All new features and UI changes must prioritize mobile design.**

- Design for mobile screens first, then enhance for larger screens
- Test on mobile viewports before desktop
- Ensure touch targets are at least 44x44px
- Avoid horizontal scrolling where possible
- Use responsive patterns: accordions, collapsible sections, bottom sheets
- Time-based grids should always show time labels, even on narrow screens

### Key Mobile Considerations

- Admin dashboard must be fully usable on mobile
- Response selection should be accessible without excessive scrolling
- All interactive elements must be reachable with one hand
- Use sticky headers/footers for key actions when appropriate

## Code Style Guidelines

### TypeScript
- Strict mode enabled (`noImplicitAny`, `strictNullChecks`, etc.)
- **Never use `any` type** - use `unknown` if the type is truly unknown, then narrow with type guards
- If you must use `any` (extremely rare), add a comment explaining why and consider using `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
- Use proper typing for Convex functions (use `v.` validators)
- For Convex schemas, avoid `v.any()` - define explicit types when possible
- Prefer interfaces over type aliases for objects
- Use `as const` for literal types and type narrowing

### React
- Use functional components with hooks
- Colocate related components in feature folders
- Use TanStack Form for form state management
- Use TanStack Router for navigation (`Link`, `useNavigate`)

### Convex
- All database operations go through Convex queries/mutations
- Use indexes for queries (defined in `schema.ts`)
- Queries are real-time by default - data auto-updates
- Use `useQuery` and `useMutation` hooks from `convex/react`

### Styling
- Use Tailwind CSS utility classes
- Use `cn()` helper from `@/lib/utils` for conditional classes
- Follow shadcn/ui patterns for new components
- Support dark mode with `dark:` variants
- **Cursor pointer**: All clickable elements must show `cursor: pointer` on hover. This is enforced globally in `src/styles.css` for buttons, links, and elements with interactive roles. Disabled elements (`:disabled`, `.disabled` class, or `aria-disabled="true"`) are excluded. If adding custom clickable elements, ensure they use appropriate semantic HTML or ARIA roles.

### Formatting
- Biome handles formatting (not Prettier)
- Use tabs for indentation
- Run `npm run check` before committing

## Key Patterns

### Creating Convex Queries/Mutations

```typescript
// convex/example.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getById = query({
  args: { id: v.id("tableName") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tableName", {
      name: args.name,
      createdAt: Date.now(),
    });
  },
});
```

### Using Convex in React

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

function MyComponent() {
  const data = useQuery(api.example.getById, { id: someId });
  const createItem = useMutation(api.example.create);

  // data is undefined while loading, then updates in real-time
}
```

### Route Components (TanStack Router)

```typescript
// src/routes/example.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/example")({
  component: ExamplePage,
});

function ExamplePage() {
  return <div>...</div>;
}
```

### Form Handling (TanStack Form + Zod)

```typescript
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1, "Required"),
});

function MyForm() {
  const form = useForm({
    defaultValues: { title: "" },
    validatorAdapter: zodValidator(),
    validators: { onChange: schema },
    onSubmit: async ({ value }) => {
      // handle submit
    },
  });
}
```

## Database Schema

The Convex schema (`convex/schema.ts`) defines four tables:

1. **users** - Registered accounts (for future use)
2. **events** - Scheduling events with configuration
3. **responses** - User availability submissions
4. **auditLogs** - Super admin action tracking

Key fields:
- `events.adminToken` - Secret token for event admin access
- `responses.editToken` - Secret token for editing responses
- `events.isActive` - Soft delete flag
- `auditLogs.action` - Type of admin action (delete_event, toggle_event_status, etc.)

## Testing

### Test Requirements

**All new features must include unit tests.** This is a mandatory part of feature implementation, not a follow-up task.

When implementing a new feature, you must:
1. Add tests for new Convex queries/mutations in `convex/*.test.ts`
2. Add tests for new validation schemas in `src/lib/validation-schemas.test.ts`
3. Add tests for new utility functions in `src/lib/*.test.ts`
4. Run `npm run test` before considering a feature complete

### Unit Tests
```bash
npm run test              # Run all tests
npm run test -- --watch   # Watch mode
```

### Test Patterns

```typescript
// Convex function tests use convex-test
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

describe("events", () => {
  test("create event", async () => {
    const t = convexTest(schema);
    const eventId = await t.mutation(api.events.create, { ... });
    expect(eventId).toBeDefined();
  });
});
```

```typescript
// Validation schema tests
import { describe, expect, it } from "vitest";
import { mySchema } from "./validation-schemas";

describe("mySchema", () => {
  it("should accept valid data", () => {
    const result = mySchema.safeParse({ field: "value" });
    expect(result.success).toBe(true);
  });

  it("should reject invalid data", () => {
    const result = mySchema.safeParse({ field: "" });
    expect(result.success).toBe(false);
  });
});
```

## Common Tasks

### Adding a New Route
1. Create file in `src/routes/` following TanStack Router conventions
2. Export `Route` using `createFileRoute()`
3. Routes auto-register via file-based routing

### Adding a New UI Component
```bash
npx shadcn@latest add <component-name>
```
Components are added to `src/components/ui/`.

### Adding a Database Field
1. Update `convex/schema.ts`
2. Convex handles migrations automatically
3. Update any affected queries/mutations

### Adding a Convex Function
1. Add to appropriate file in `convex/` (or create new file)
2. Export query/mutation/action
3. **Add tests** in the corresponding `convex/*.test.ts` file
4. Import via `api` object in React components
5. Run `npm run test` to verify tests pass

## Important Considerations

### Security
- Admin tokens provide event management access - treat as secrets
- Edit tokens allow response modification - treat as secrets
- Never expose tokens in URLs visible to other users
- Validate all inputs in Convex mutations

### Performance
- Convex queries are real-time subscriptions - minimize unnecessary queries
- Use indexes for frequent query patterns
- Large date ranges may impact grid rendering performance

### Accessibility
- Use semantic HTML elements
- Include proper ARIA labels
- Ensure keyboard navigation works
- Test with screen readers for critical flows

## Authentication & Authorization

### Clerk Integration
- Authentication is handled via Clerk
- `ClerkProvider` wraps the app in `ConvexClientProvider.tsx`
- Sign in/out buttons in the header
- JWT verification configured in `convex/auth.config.ts`

### Super Admin Dashboard
- Access controlled via `SUPER_ADMIN_EMAILS` environment variable (Convex Dashboard)
- Routes under `/admin/*` require super admin access
- Features: view all events/responses, toggle event status, delete events/responses
- All admin actions are logged to `auditLogs` table
- **Super admins automatically have premium access** - they never see upgrade prompts

#### Security Behavior
- Admin queries return `null` (not throw) when unauthorized to avoid error modals during auth loading
- Admin mutations throw errors for hard failures (correct behavior for write operations)
- Unauthorized access attempts are logged server-side: `console.warn` with user email and subject ID
- `UnauthorizedPage` component shows email only in development (`import.meta.env.DEV`)
- Unauthorized users on admin sub-routes are redirected to `/admin` with `replace: true` (hides URL from history)

### Environment Variables (Convex Dashboard)
```bash
CLERK_JWT_ISSUER_DOMAIN=https://your-instance.clerk.accounts.dev
SUPER_ADMIN_EMAILS=admin@example.com,other@example.com
```

## What's Not Implemented Yet

See `USER_STORIES.md` for full status. Major missing features:
- Premium features / Stripe (Epic 5)
- Event deletion for event creators (Stories 7.1, 7.2)
- Email notifications (Story 6.2)
- User accounts linked to events (Epic 4 partially done - auth exists but not linked to event creation)

## Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project setup and overview |
| `FEATURES.md` | Implemented features list |
| `USER_STORIES.md` | Requirements and implementation status |
| `CLAUDE.md` | This file - AI assistant guidelines |
