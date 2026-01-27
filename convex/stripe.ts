import { v } from "convex/values";
import Stripe from "stripe";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

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
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated. Please sign in to subscribe.");
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
