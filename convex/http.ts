import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

const http = httpRouter();

/**
 * Stripe webhook handler
 * Handles subscription lifecycle events from Stripe
 */
http.route({
	path: "/stripe-webhook",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

		if (!stripeSecretKey || !webhookSecret) {
			console.error("[Stripe Webhook] Missing Stripe configuration");
			return new Response("Webhook not configured", { status: 500 });
		}

		const stripe = new Stripe(stripeSecretKey, {
			apiVersion: "2025-12-15.clover",
		});

		// Get the raw body and signature
		const body = await request.text();
		const signature = request.headers.get("stripe-signature");

		if (!signature) {
			console.error("[Stripe Webhook] Missing signature");
			return new Response("Missing signature", { status: 400 });
		}

		let event: Stripe.Event;

		try {
			event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error(`[Stripe Webhook] Signature verification failed: ${message}`);
			return new Response(`Webhook signature verification failed: ${message}`, {
				status: 400,
			});
		}

		console.log(`[Stripe Webhook] Received event: ${event.type}`);

		try {
			switch (event.type) {
				case "checkout.session.completed": {
					const session = event.data.object as Stripe.Checkout.Session;

					if (session.mode === "subscription" && session.subscription) {
						const subscriptionId = typeof session.subscription === "string"
							? session.subscription
							: session.subscription.id;
						const customerId = typeof session.customer === "string"
							? session.customer
							: session.customer?.id;

						if (customerId) {
							// Get subscription details for expiration date
							const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
								expand: ["items.data"],
							});

							// In newer Stripe API, current_period_end is on subscription items
							const firstItem = subscription.items.data[0];
							const periodEnd = firstItem?.current_period_end ?? null;

							await ctx.runMutation(internal.users.updateSubscription, {
								stripeCustomerId: customerId,
								subscriptionId: subscriptionId,
								subscriptionTier: "premium",
								subscriptionExpiresAt: periodEnd ? periodEnd * 1000 : undefined,
							});

							console.log(`[Stripe Webhook] Activated premium for customer: ${customerId}`);
						}
					}
					break;
				}

				case "customer.subscription.updated": {
					const subscription = event.data.object as Stripe.Subscription;
					const customerId = typeof subscription.customer === "string"
						? subscription.customer
						: subscription.customer.id;

					// Check if subscription is still active
					const isActive = ["active", "trialing"].includes(subscription.status);

					// In newer Stripe API, current_period_end is on subscription items
					const firstItem = subscription.items?.data[0];
					const periodEnd = firstItem?.current_period_end ?? null;

					await ctx.runMutation(internal.users.updateSubscription, {
						stripeCustomerId: customerId,
						subscriptionId: subscription.id,
						subscriptionTier: isActive ? "premium" : "free",
						subscriptionExpiresAt: periodEnd ? periodEnd * 1000 : undefined,
					});

					console.log(
						`[Stripe Webhook] Updated subscription for customer ${customerId}: status=${subscription.status}`,
					);
					break;
				}

				case "customer.subscription.deleted": {
					const subscription = event.data.object as Stripe.Subscription;
					const customerId = typeof subscription.customer === "string"
						? subscription.customer
						: subscription.customer.id;

					await ctx.runMutation(internal.users.updateSubscription, {
						stripeCustomerId: customerId,
						subscriptionId: subscription.id,
						subscriptionTier: "free",
						subscriptionExpiresAt: undefined,
					});

					console.log(
						`[Stripe Webhook] Cancelled subscription for customer: ${customerId}`,
					);
					break;
				}

				default:
					console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error(`[Stripe Webhook] Error processing event: ${message}`);
			// Return 200 to acknowledge receipt even if processing failed
			// Stripe will retry if we return an error
		}

		return new Response("OK", { status: 200 });
	}),
});

export default http;
