# Deployment Guide: Vercel + Neon Integration

This guide walks through deploying TimeSync with automatic database branching for preview deployments.

## Architecture Overview

```
main branch (GitHub) ──► Production deployment (Vercel) ──► Production database (Neon main branch)
                                                                    │
PR / feature branch ──► Preview deployment (Vercel) ──► Preview database (Neon branch)
```

Each pull request gets its own:
- Vercel preview deployment
- Neon database branch (copy-on-write from production)

When the PR is merged/closed, the preview database branch is automatically deleted.

---

## Step 1: Set Up Neon Database

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project (or use existing)
3. Note your **Project ID** from the project settings
4. Your main branch is automatically created - this will be your production database

## Step 2: Deploy to Vercel

1. Go to [Vercel](https://vercel.com) and import your GitHub repository
2. Vercel will auto-detect the framework settings
3. **Don't deploy yet** - first install the Neon integration

## Step 3: Install Neon Vercel Integration

1. Go to [Neon Vercel Integration](https://vercel.com/integrations/neon)
2. Click "Add Integration"
3. Select your Vercel account and project
4. Connect your Neon account and select your project
5. Configure the integration:
   - **Production branch**: `main` (your Neon main branch)
   - **Development branch**: Choose to create preview branches for each PR
   - Enable "Create a branch for each preview deployment"

The integration automatically:
- Sets `DATABASE_URL` for production deployments (pointing to main branch)
- Creates a new Neon branch for each preview deployment
- Sets `DATABASE_URL` for preview deployments (pointing to the preview branch)
- Deletes preview branches when deployments are removed

## Step 4: Configure Environment Variables

In Vercel project settings, add these environment variables:

| Variable | Description | Scope |
|----------|-------------|-------|
| `DATABASE_URL` | Set automatically by Neon integration | All |
| `VITE_CONVEX_URL` | Your Convex deployment URL from [dashboard.convex.dev](https://dashboard.convex.dev) | Production / Preview |
| `BETTER_AUTH_SECRET` | Generate with `openssl rand -base64 32` | All |
| `BETTER_AUTH_URL` | Production: your domain, Preview: `https://*.vercel.app` | Production / Preview |
| `NODE_ENV` | `production` | Production |

For preview deployments, you can use:
- `BETTER_AUTH_URL`: Use Vercel's automatic URL or set to your preview domain pattern

## Step 5: Run Initial Migration

Before your first deployment, ensure your production database has the schema:

```bash
# Set your production DATABASE_URL locally
export DATABASE_URL="postgresql://..."

# Generate and run migrations
npm run db:generate
npm run db:migrate
```

Or use Vercel's deployment to run migrations automatically by adding a build step.

## Step 6: Deploy

1. Push to your main branch
2. Vercel will automatically deploy to production
3. Create a PR to test preview deployments

---

## GitHub Actions CI

The `.github/workflows/ci.yml` file runs on every push and PR:
- **Lint**: Checks code style with Biome
- **Typecheck**: Validates TypeScript types
- **Test**: Runs Vitest tests
- **Build**: Ensures the app builds successfully

CI runs independently of Vercel deployments but must pass before merging.

---

## Database Branching Workflow

### Development Flow

1. Create a feature branch in Git
2. Open a PR
3. Neon integration creates a database branch automatically
4. Your preview deployment uses the isolated database branch
5. Test freely - changes won't affect production
6. Merge PR - preview branch is deleted, changes go to production

### Running Migrations on Preview Branches

Preview branches start as a copy of production. To test schema changes:

```bash
# In your PR, migrations run against the preview branch
# Add this to your build command if needed:
npm run db:migrate && npm run build
```

### Manual Branch Management

You can also manage branches via Neon Console or CLI:

```bash
# Install Neon CLI
npm install -g neonctl

# Create a branch manually
neonctl branches create --name my-feature

# List branches
neonctl branches list

# Delete a branch
neonctl branches delete my-feature
```

---

## Troubleshooting

### Preview deployment can't connect to database
- Check the Neon integration is properly configured
- Verify `DATABASE_URL` is set in Vercel environment variables
- Check Neon dashboard for the preview branch status

### Migrations fail on preview
- Ensure migrations are committed to your branch
- Check that `drizzle-kit` is in dependencies (not just devDependencies) if running in production build

### Build fails on Vercel
- Check the build logs for specific errors
- Ensure all dependencies are properly installed
- Verify `NITRO_PRESET=vercel` if auto-detection fails

---

## Optional: Neon GitHub Actions

For more control, you can use Neon's GitHub Actions directly:

```yaml
# .github/workflows/preview-db.yml
name: Create Preview Database

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  create-branch:
    runs-on: ubuntu-latest
    steps:
      - uses: neondatabase/create-branch-action@v5
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          branch_name: preview/pr-${{ github.event.pull_request.number }}
          api_key: ${{ secrets.NEON_API_KEY }}
```

This is optional if using the Vercel integration, which handles this automatically.
