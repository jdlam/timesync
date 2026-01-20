# TimeSync

A modern scheduling app for coordinating group availability. Create events, share links, and find the best meeting times with an interactive heatmap visualization.

## Features

- **No account required** - Create events and submit availability as a guest
- **Interactive availability grid** - Click, drag, or tap to select time slots
- **Real-time heatmap** - Visualize group availability at a glance
- **View individual responses** - Click a response to highlight their specific availability
- **Best times recommendation** - Automatically highlights top 3 time slots
- **Secure admin links** - Manage events without authentication
- **Edit responses** - Update availability via unique edit links
- **Dark mode** - Light, dark, and system theme support
- **Mobile responsive** - Works seamlessly on any device
- **Timezone support** - Full IANA timezone support with automatic detection

See [FEATURES.md](./FEATURES.md) for a complete list of implemented features.

## How It Works

1. **Create an event** - Set title, dates, time range, and slot duration
2. **Share the public link** - Send to participants
3. **Collect availability** - Participants select their available time slots
4. **View results** - Admin dashboard shows heatmap of overlapping availability
5. **Find the best time** - Identify when most people are available

## Getting Started

### Prerequisites

- Node.js 24+
- npm or pnpm
- Convex account (free at [convex.dev](https://convex.dev))

### Installation

```bash
npm install
```

### Convex Setup

1. Create a free account at [convex.dev](https://convex.dev)
2. Install the Convex CLI: `npm install -g convex`
3. Run `npx convex dev` to link your project and create a deployment
4. The CLI will create a `.env.local` file with your deployment URL

### Development

Start the development server:

```bash
npm run dev
```

This runs both the Vite frontend (port 3000) and Convex backend in parallel.

You can also run them separately:

```bash
npm run dev:frontend  # Vite dev server only
npm run dev:backend   # Convex dev only
```

### Environment Variables

The `.env.local` file should contain:

```
CONVEX_DEPLOYMENT=<your-convex-deployment>
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend dev servers |
| `npm run dev:frontend` | Start Vite dev server only |
| `npm run dev:backend` | Start Convex dev only |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests with Vitest |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Lint code with Biome |
| `npm run format` | Format code with Biome |
| `npm run check` | Run all Biome checks |

## Tech Stack

- **Frontend**: React 19, TanStack Router, TanStack Form
- **Backend**: Convex (real-time database and serverless functions)
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Form Validation**: Zod
- **Date Handling**: date-fns, date-fns-tz
- **Testing**: Vitest, Testing Library, convex-test
- **Linting/Formatting**: Biome
- **Pre-commit Hooks**: Husky, lint-staged

## Project Structure

```
src/
├── components/           # React components
│   ├── availability-grid/   # Availability selection grid
│   ├── heatmap/             # Heatmap visualization
│   └── ui/                  # shadcn/ui components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and helpers
│   ├── heatmap-utils.ts     # Heatmap calculations
│   ├── time-utils.ts        # Time/timezone utilities
│   ├── validation-schemas.ts # Zod schemas
│   └── theme.tsx            # Theme context
└── routes/               # File-based routing
    ├── index.tsx            # Landing page
    └── events/
        ├── create.tsx       # Event creation
        ├── $eventId/
        │   ├── index.tsx    # Public event page
        │   ├── edit/$editToken.tsx  # Edit response
        │   └── admin/$adminToken.tsx # Admin dashboard

convex/
├── schema.ts             # Database schema
├── events.ts             # Event queries/mutations
└── responses.ts          # Response queries/mutations
```

## Adding UI Components

This project uses [shadcn/ui](https://ui.shadcn.com/). To add new components:

```bash
npx shadcn@latest add <component-name>
```

For example:
```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
```

## Deployment

### Convex Backend

Deploy your Convex functions to production:

```bash
npx convex deploy
```

### Frontend

The frontend can be deployed to any static hosting platform (Vercel, Netlify, etc.).

Build the production bundle:

```bash
npm run build
```

The output will be in the `.output` directory.

## Code Quality

This project enforces code quality through:

- **Biome** - Fast linting and formatting
- **TypeScript** - Strict type checking
- **Husky** - Pre-commit hooks
- **lint-staged** - Run checks only on staged files

Pre-commit hooks automatically run Biome checks on staged files.

## Documentation

- [FEATURES.md](./FEATURES.md) - Complete list of implemented features
- [USER_STORIES.md](./USER_STORIES.md) - Product requirements and user stories
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Database configuration (legacy Drizzle setup)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. **Add tests for new features** - All new Convex functions, validation schemas, and utilities must have corresponding unit tests
5. Run checks: `npm run check && npm run typecheck && npm run test`
6. Commit your changes (pre-commit hooks will run automatically)
7. Push to your fork and submit a pull request

See [CLAUDE.md](./CLAUDE.md) for detailed development guidelines.

## License

MIT
