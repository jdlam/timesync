import { v } from "convex/values";
import Stripe from "stripe";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * Validate that a redirect URL belongs to the app's own domain.
 * Prevents open redirect attacks via Stripe redirect URLs.
 */
export function validateRedirectUrl(url: string): void {
	const allowedDomain = process.env.APP_URL;
	if (!allowedDomain) {
		throw new Error("APP_URL is not configured");
	}

	let allowed: URL;
	try {
		allowed = new URL(allowedDomain);
	} catch {
		throw new Error("APP_URL is invalid");
	}
	if (allowed.protocol !== "https:" && allowed.protocol !== "http:") {
		throw new Error("APP_URL must use HTTP(S)");
	}

	try {
		const parsed = new URL(url);
		// Enforce HTTP(S) scheme and matching origin (protocol + hostname + port)
		if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
			throw new Error("Invalid redirect URL: must use HTTP(S)");
		}
		if (parsed.origin !== allowed.origin) {
			throw new Error("Invalid redirect URL: domain mismatch");
		}
	} catch (e) {
		if (e instanceof Error && e.message.includes("redirect URL")) {
			throw e;
		}
		throw new Error("Invalid redirect URL");
	}
}

/**
 * Create a Stripe Checkout session for subscription
 * Returns the checkout URL to redirect the user to
 */
export const createCheckoutSession = action({
	args: {
		successUrl: v.string(),
		cancelUrl: v.string(),
	},
	handler: async (ctx, args): Promise<{ url: string }> => {
		// Validate redirect URLs before proceeding
		validateRedirectUrl(args.successUrl);
		validateRedirectUrl(args.cancelUrl);

		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated. Please sign in to subscribe.");
		}

		// Prevent duplicate subscriptions for users who already have premium access.
		const subscription = await ctx.runQuery(api.users.getCurrentUserSubscription, {});
		if (subscription?.isPremium) {
			throw new Error("You already have an active premium subscription.");
		}

		const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
		const priceId = process.env.STRIPE_PRICE_ID;

		if (!stripeSecretKey) {
			throw new Error("Stripe is not configured");
		}
		if (!priceId) {
			throw new Error("Stripe price is not configured");
		}

		const stripe = new Stripe(stripeSecretKey, {
			apiVersion: "2025-12-15.clover",
		});

		// Ensure user record exists before proceeding
		await ctx.runMutation(internal.users.ensureUserExists, {
			clerkId: identity.subject,
			email: identity.email ?? "",
			name: identity.name ?? identity.email ?? "Unknown",
		});

		// Get the user's existing Stripe customer ID if they have one
		const user = await ctx.runQuery(
			// @ts-expect-error - internal API type issue
			internal.users.getCurrentUserRecord,
			{},
		);
		let customerId = user?.stripeCustomerId;

		// Create a new Stripe customer if needed
		if (!customerId) {
			const customer = await stripe.customers.create({
				email: identity.email ?? undefined,
				name: identity.name ?? undefined,
				metadata: {
					clerkId: identity.subject,
				},
			});
			customerId = customer.id;

			// Save the customer ID to the user record
			await ctx.runMutation(internal.users.setStripeCustomerId, {
				clerkId: identity.subject,
				stripeCustomerId: customerId,
			});
		}

		// Create checkout session
		const session = await stripe.checkout.sessions.create({
			customer: customerId,
			mode: "subscription",
			payment_method_types: ["card"],
			line_items: [
				{
					price: priceId,
					quantity: 1,
				},
			],
			success_url: args.successUrl,
			cancel_url: args.cancelUrl,
			metadata: {
				clerkId: identity.subject,
			},
		});

		if (!session.url) {
			throw new Error("Failed to create checkout session");
		}

		return { url: session.url };
	},
});

/**
 * Create a Stripe Customer Portal session for managing subscription
 * Returns the portal URL to redirect the user to
 */
export const createPortalSession = action({
	args: {
		returnUrl: v.string(),
	},
	handler: async (ctx, args): Promise<{ url: string }> => {
		// Validate redirect URL before proceeding
		validateRedirectUrl(args.returnUrl);

		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
		if (!stripeSecretKey) {
			throw new Error("Stripe is not configured");
		}

		const stripe = new Stripe(stripeSecretKey, {
			apiVersion: "2025-12-15.clover",
		});

		// Get the user's Stripe customer ID
		const user = await ctx.runQuery(
			// @ts-expect-error - internal API type issue
			internal.users.getCurrentUserRecord,
			{},
		);

		if (!user?.stripeCustomerId) {
			throw new Error("No subscription found. Please subscribe first.");
		}

		// Create portal session
		const session = await stripe.billingPortal.sessions.create({
			customer: user.stripeCustomerId,
			return_url: args.returnUrl,
		});

		return { url: session.url };
	},
});
