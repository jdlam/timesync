# Deployment Guide: Vercel + Convex + Clerk + Stripe

This project deploys a static frontend to Vercel and backend functions to Convex.
Stripe billing and webhook processing run through Convex.

## Architecture

- Frontend: Vercel (`npm run build`, output `.output`)
- Backend: Convex deployment (queried by `VITE_CONVEX_URL`)
- Auth: Clerk (JWT verified by Convex)
- Billing: Stripe Checkout + Customer Portal + Convex webhook at `/stripe-webhook`

## 1. Create/Confirm Convex Production Deployment

1. Open [Convex Dashboard](https://dashboard.convex.dev).
2. Create/select your project.
3. Ensure you have a production deployment.
4. Copy:
- Deployment URL (for `VITE_CONVEX_URL`)
- Deploy key (for `CONVEX_DEPLOY_KEY` used by Vercel builds)

## 2. Configure Convex Environment Variables (Production)

Set these in Convex Dashboard -> Project -> Settings -> Environment Variables:

- `CLERK_JWT_ISSUER_DOMAIN` (from Clerk)
- `SUPER_ADMIN_EMAILS` (comma-separated)
- `APP_URL` (your canonical app origin, e.g. `https://timesync.me`)
- `APP_URL_ADDITIONAL_ORIGINS` (optional comma-separated trusted origins, e.g. `https://www.timesync.me`)
- `STRIPE_SECRET_KEY` (`sk_live_...` for live)
- `STRIPE_WEBHOOK_SECRET` (`whsec_...` for live webhook)
- `STRIPE_PRICE_ID` (live recurring price id)

Important:
- `APP_URL` must be your app origin, not a Stripe URL.
- `APP_URL` must match one production origin exactly (scheme + host + optional port).
- If you support multiple trusted origins (for example apex + `www`), set `APP_URL_ADDITIONAL_ORIGINS`.

## 3. Configure Stripe (Live)

1. Create/confirm your live product + recurring price.
2. Add webhook endpoint:
- `https://<your-convex-production-deployment>.convex.site/stripe-webhook`
3. Subscribe webhook to:
- `checkout.session.completed`
- `checkout.session.expired`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
4. Copy webhook signing secret into Convex as `STRIPE_WEBHOOK_SECRET`.

## 4. Configure Vercel Project

The repo already uses this build command (`vercel.json`):

```json
"buildCommand": "npx convex deploy --yes --cmd \"npm run build\""
```

Set Vercel environment variables:

Required:
- `VITE_CONVEX_URL` (Convex production deployment URL)
- `VITE_CLERK_PUBLISHABLE_KEY` (Clerk publishable key)
- `CONVEX_DEPLOY_KEY` (Convex deploy key)

Optional:
- `VITE_STRIPE_PUBLISHABLE_KEY` (recommended if exposing client Stripe usage)
- `VITE_UMAMI_SCRIPT_URL`
- `VITE_UMAMI_WEBSITE_ID`

Make sure required vars are enabled for the environments you deploy (`Production`, and `Preview` if needed).

## 5. Clerk Configuration

- Vercel uses `VITE_CLERK_PUBLISHABLE_KEY`.
- Convex verifies tokens using `CLERK_JWT_ISSUER_DOMAIN`.
- Ensure both point to the same Clerk instance.

## 6. Launch Checklist

1. `npm run typecheck`
2. `npm test`
3. Confirm Stripe webhook endpoint is reachable and signed.
4. Confirm Convex production env vars are all set (especially `APP_URL`, Stripe keys/secrets).
5. Trigger a live upgrade flow and verify webhook updates user tier to premium.
6. Verify Customer Portal opens and returns correctly.
7. Verify admin/edit token pages work and analytics/security headers are as expected.

## Troubleshooting

- `APP_URL is not configured` or redirect mismatch:
  - Set/fix `APP_URL` in Convex production env vars.
  - If your app uses multiple trusted origins, also set `APP_URL_ADDITIONAL_ORIGINS`.
- Stripe checkout fails in production:
  - Check live `STRIPE_SECRET_KEY` + live `STRIPE_PRICE_ID`.
- Webhook events not updating subscriptions:
  - Verify endpoint URL, webhook event subscriptions, and `STRIPE_WEBHOOK_SECRET`.
- Vercel build cannot deploy Convex:
  - Confirm `CONVEX_DEPLOY_KEY` is set in Vercel for that environment.
