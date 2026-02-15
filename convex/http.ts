import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

const http = httpRouter();

function handleSubscriptionUpdateResult(params: {
	result: { success: boolean; error?: string };
	action: string;
	customerId: string;
	subscriptionId: string;
}): void {
	const { result, action, customerId, subscriptionId } = params;
	if (result.success) {
		return;
	}

	if (result.error === "User not found") {
		// Permanent mapping issue: Stripe customer doesn't exist in our users table.
		// Acknowledge the webhook to avoid infinite retries and rely on logs/alerting.
		console.warn(
			`[Stripe Webhook] NON-RETRIABLE: ${action} skipped because user not found: customer=${customerId}, subscription=${subscriptionId}`,
		);
		return;
	}

	throw new Error(
		`Failed to ${action} for customer=${customerId}, subscription=${subscriptionId}: ${result.error ?? "Unknown error"}`,
	);
}

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
			// Use async version for Convex runtime (web-standard crypto APIs)
			event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
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
					console.log(
						`[Stripe Webhook] Checkout completed: session=${session.id}, customer=${session.customer}, mode=${session.mode}`,
					);

					if (session.mode === "subscription" && session.subscription) {
						const subscriptionId =
							typeof session.subscription === "string"
								? session.subscription
								: session.subscription.id;
						const customerId =
							typeof session.customer === "string"
								? session.customer
								: session.customer?.id;

						if (customerId) {
							// Get subscription details for expiration date
							const subscription = await stripe.subscriptions.retrieve(
								subscriptionId,
								{
									expand: ["items.data"],
								},
							);

							// In newer Stripe API, current_period_end is on subscription items
							const firstItem = subscription.items.data[0];
							const periodEnd = firstItem?.current_period_end ?? null;

							const result = await ctx.runMutation(
								internal.users.updateSubscription,
								{
									stripeCustomerId: customerId,
									subscriptionId: subscriptionId,
									subscriptionTier: "premium",
									subscriptionExpiresAt: periodEnd ? periodEnd * 1000 : undefined,
								},
							);

							if (result.success) {
								console.log(
									`[Stripe Webhook] SUCCESS: Activated premium for customer=${customerId}, subscription=${subscriptionId}`,
								);
							} else {
								handleSubscriptionUpdateResult({
									result,
									action: "activate premium",
									customerId,
									subscriptionId,
								});
							}
						} else {
							console.error(
								`[Stripe Webhook] ERROR: No customer ID in checkout session ${session.id}`,
							);
						}
					} else {
						console.log(
							`[Stripe Webhook] Skipping non-subscription checkout: mode=${session.mode}`,
						);
					}
					break;
				}

				case "checkout.session.expired": {
					const session = event.data.object as Stripe.Checkout.Session;
					console.warn(
						`[Stripe Webhook] EXPIRED: Checkout session expired without payment: session=${session.id}, customer=${session.customer}`,
					);
					break;
				}

				case "invoice.payment_failed": {
					const invoice = event.data.object as Stripe.Invoice;
					const customerId =
						typeof invoice.customer === "string"
							? invoice.customer
							: invoice.customer?.id;

					// In newer Stripe API, subscription info is in parent.subscription_details
					const subscriptionDetails = invoice.parent?.subscription_details;
					const subscriptionId = subscriptionDetails?.subscription
						? typeof subscriptionDetails.subscription === "string"
							? subscriptionDetails.subscription
							: subscriptionDetails.subscription.id
						: null;

					console.error(
						`[Stripe Webhook] PAYMENT FAILED: customer=${customerId}, subscription=${subscriptionId ?? "unknown"}, amount=${invoice.amount_due}, attempt=${invoice.attempt_count}`,
					);

					// Note: Stripe will automatically retry failed payments based on your settings
					// The subscription status will be updated via customer.subscription.updated event
					break;
				}

				case "customer.subscription.updated": {
					const subscription = event.data.object as Stripe.Subscription;
					const customerId =
						typeof subscription.customer === "string"
							? subscription.customer
							: subscription.customer.id;

					// Check if subscription is still active
					const isActive = ["active", "trialing"].includes(subscription.status);
					const isPastDue = subscription.status === "past_due";
					const isCanceled = subscription.status === "canceled";
					const isUnpaid = subscription.status === "unpaid";

					// In newer Stripe API, current_period_end is on subscription items
					const firstItem = subscription.items?.data[0];
					const periodEnd = firstItem?.current_period_end ?? null;

					// Log status changes with appropriate level
					if (isPastDue) {
						console.warn(
							`[Stripe Webhook] PAST DUE: Subscription payment overdue for customer=${customerId}, subscription=${subscription.id}`,
						);
					} else if (isCanceled || isUnpaid) {
						console.warn(
							`[Stripe Webhook] INACTIVE: Subscription ${subscription.status} for customer=${customerId}, subscription=${subscription.id}`,
						);
					}

					const result = await ctx.runMutation(
						internal.users.updateSubscription,
						{
							stripeCustomerId: customerId,
							subscriptionId: subscription.id,
							subscriptionTier: isActive ? "premium" : "free",
							subscriptionExpiresAt: periodEnd ? periodEnd * 1000 : undefined,
						},
					);

					if (result.success) {
						console.log(
							`[Stripe Webhook] Updated subscription: customer=${customerId}, status=${subscription.status}, tier=${isActive ? "premium" : "free"}`,
						);
					} else {
						handleSubscriptionUpdateResult({
							result,
							action: "update subscription",
							customerId,
							subscriptionId: subscription.id,
						});
					}
					break;
				}

				case "customer.subscription.deleted": {
					const subscription = event.data.object as Stripe.Subscription;
					const customerId =
						typeof subscription.customer === "string"
							? subscription.customer
							: subscription.customer.id;

					const result = await ctx.runMutation(
						internal.users.updateSubscription,
						{
							stripeCustomerId: customerId,
							subscriptionId: subscription.id,
							subscriptionTier: "free",
							subscriptionExpiresAt: undefined,
						},
					);

					if (result.success) {
						console.log(
							`[Stripe Webhook] Cancelled subscription: customer=${customerId}, subscription=${subscription.id}`,
						);
					} else {
						handleSubscriptionUpdateResult({
							result,
							action: "cancel subscription",
							customerId,
							subscriptionId: subscription.id,
						});
					}
					break;
				}

				default:
					console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error(`[Stripe Webhook] Error processing event: ${message}`);
			// Return 500 so Stripe retries transient failures, but do not expose internals.
			return new Response("Webhook processing failed", {
				status: 500,
			});
		}

		return new Response("OK", { status: 200 });
	}),
});

export default http;
