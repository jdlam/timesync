# Database Setup Guide

This guide will help you set up your database for TimeSync.

## Prerequisites

- Node.js installed (v18 or higher)
- A Neon PostgreSQL database account (free tier available at https://neon.tech)

---

## Step 1: Create Neon Database

1. Go to https://neon.tech and sign up for a free account
2. Create a new project
3. Copy your connection string (looks like: `postgresql://user:password@host/database`)

---

## Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Neon database connection string:
   ```
   DATABASE_URL=postgresql://your-connection-string
   ```

3. Generate a secure auth secret:
   ```bash
   openssl rand -base64 32
   ```

4. Add it to `.env`:
   ```
   BETTER_AUTH_SECRET=your-generated-secret
   ```

---

## Step 3: Database Migration Commands

### Generate Migration Files
Creates SQL migration files based on your schema changes:
```bash
npm run db:generate
```

This will create migration files in the `drizzle/` directory.

### Apply Migrations
Runs all pending migrations on your database:
```bash
npm run db:migrate
```

### Push Schema (Dev Only)
Directly pushes schema changes to the database without creating migration files.
**Warning:** Use only in development. Use migrations in production.
```bash
npm run db:push
```

### Open Database Studio
Opens Drizzle Studio - a GUI for viewing and editing your database:
```bash
npm run db:studio
```

Then open https://local.drizzle.studio in your browser.

### Drop Migration
Remove the last migration (use with caution):
```bash
npm run db:drop
```

---

## Step 4: Initial Setup

For the first time setup, run:

```bash
# Generate the initial migration
npm run db:generate

# Apply it to your database
npm run db:migrate
```

You should see output like:
```
✓ Generated migration: 0000_initial_setup.sql
✓ Applied migration: 0000_initial_setup.sql
```

---

## Step 5: Verify Setup

Open Drizzle Studio to verify your tables were created:
```bash
npm run db:studio
```

You should see three tables:
- `users`
- `events`
- `responses`

---

## Workflow Summary

### When developing:
1. **Modify schema**: Edit `src/db/schema.ts`
2. **Generate migration**: `npm run db:generate`
3. **Review migration**: Check the generated SQL in `drizzle/` folder
4. **Apply migration**: `npm run db:migrate`

### Quick dev iteration (no migration history):
```bash
npm run db:push
```

### Inspect database:
```bash
npm run db:studio
```

---

## Troubleshooting

### Error: "DATABASE_URL is not set"
- Make sure you created a `.env` file with `DATABASE_URL`
- Restart your terminal/IDE after creating `.env`

### Error: "relation already exists"
- Your migration might have already been applied
- Check your database with `npm run db:studio`
- If needed, manually drop tables and re-run migrations

### Error: "connect ECONNREFUSED"
- Check that your DATABASE_URL is correct
- Verify your Neon database is active (Neon pauses inactive databases)
- Check your internet connection

---

## Production Deployment

For production:
1. Set `DATABASE_URL` in your hosting platform's environment variables
2. Run migrations as part of your deployment pipeline:
   ```bash
   npm run db:migrate
   ```
3. **Never** use `db:push` in production

---

## Additional Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Drizzle Kit Docs](https://orm.drizzle.team/kit-docs/overview)
- [Neon Documentation](https://neon.tech/docs/introduction)
