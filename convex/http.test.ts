import { convexTest } from "convex-test";
import Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleSubscriptionUpdateResult, handleUnsubscribeRequest } from "./http";
import schema from "./schema";
import { modules } from "./test.setup";
import { USER_NOT_FOUND_ERROR } from "./users";

// http.ts's checkout.session.completed branch calls the real
// `stripe.subscriptions.retrieve` over the network (Stripe's SDK uses its own
// HTTP client here, not the global `fetch`, so stubbing `fetch` doesn't reach
// it). Stub just that one call, keeping the real `webhooks` signing /
// verification logic (`generateTestHeaderStringAsync` /
// `constructEventAsync`) intact so signature checks stay meaningful.
let mockSubscriptionRetrieve: ((subscriptionId: string) => Promise<unknown>) | null = null;

vi.mock("stripe", async (importOriginal) => {
	const actual = await importOriginal<typeof import("stripe")>();
	class TestStripe extends actual.default {
		constructor(...args: ConstructorParameters<typeof actual.default>) {
			super(...args);
			const original = this.subscriptions.retrieve.bind(this.subscriptions);
			this.subscriptions.retrieve = ((...retrieveArgs: Parameters<typeof original>) =>
				mockSubscriptionRetrieve
					? mockSubscriptionRetrieve(retrieveArgs[0] as string)
					: original(...retrieveArgs)) as typeof original;
		}
	}
	return { ...actual, default: TestStripe };
});

const STRIPE_SECRET_KEY = "sk_test_dummy";
const STRIPE_WEBHOOK_SECRET = "whsec_test_dummy";

async function signStripeEvent(payload: string): Promise<string> {
	const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-12-15.clover" });
	return stripe.webhooks.generateTestHeaderStringAsync({
		payload,
		secret: STRIPE_WEBHOOK_SECRET,
	});
}

function stripeEventPayload(event: { type: string; data: { object: unknown } }): string {
	return JSON.stringify({
		id: "evt_test_123",
		object: "event",
		api_version: "2025-12-15.clover",
		created: Math.floor(Date.now() / 1000),
		livemode: false,
		pending_webhooks: 0,
		request: { id: null, idempotency_key: null },
		...event,
	});
}

async function postStripeWebhook(
	t: ReturnType<typeof convexTest>,
	payload: string,
): Promise<Response> {
	const signature = await signStripeEvent(payload);
	return t.fetch("/stripe-webhook", {
		method: "POST",
		headers: { "stripe-signature": signature },
		body: payload,
	});
}

async function createTestUser(
	t: ReturnType<typeof convexTest>,
	overrides: Partial<{
		clerkId: string;
		stripeCustomerId: string;
		subscriptionTier: string;
	}> = {},
) {
	return t.run(async (ctx) => {
		return ctx.db.insert("users", {
			email: "user@example.com",
			name: "Test User",
			emailVerified: true,
			clerkId: overrides.clerkId ?? "clerk_123",
			stripeCustomerId: overrides.stripeCustomerId ?? "cus_123",
			subscriptionTier: overrides.subscriptionTier ?? "free",
			createdAt: Date.now(),
			updatedAt: Date.now(),
		});
	});
}

// Stubs PostHog's capture endpoint behind the global `fetch` used by
// `sendToPostHog` (convex/lib/analytics.ts).
function mockFetch(
	options: {
		postHog?: (init: RequestInit | undefined) => Promise<Response> | Response;
	} = {},
) {
	const calls: Array<{ url: string; init?: RequestInit }> = [];
	const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
		const url = input.toString();
		calls.push({ url, init });
		if (url.includes("posthog")) {
			return options.postHog
				? await options.postHog(init)
				: new Response(null, { status: 200 });
		}
		throw new Error(`Unexpected fetch call to ${url}`);
	});
	vi.stubGlobal("fetch", fetchMock);
	return {
		fetchMock,
		getPostHogCall: () => calls.find((c) => c.url.includes("posthog")),
	};
}

describe("stripe-webhook analytics", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
		mockSubscriptionRetrieve = null;
	});

	it("sends server_checkout_completed with the clerkId distinct_id and no payment details on checkout.session.completed", async () => {
		vi.stubEnv("STRIPE_SECRET_KEY", STRIPE_SECRET_KEY);
		vi.stubEnv("STRIPE_WEBHOOK_SECRET", STRIPE_WEBHOOK_SECRET);
		vi.stubEnv("POSTHOG_PROJECT_API_KEY", "phc_test");
		vi.stubEnv("POSTHOG_HOST", "https://us.i.posthog.com");
		const t = convexTest(schema, modules);
		await createTestUser(t, { clerkId: "clerk_abc", stripeCustomerId: "cus_123" });
		mockSubscriptionRetrieve = async () => ({
			id: "sub_456",
			items: { data: [{ current_period_end: 1893456000 }] },
		});
		const { getPostHogCall } = mockFetch();

		const payload = stripeEventPayload({
			type: "checkout.session.completed",
			data: {
				object: {
					id: "cs_test_123",
					object: "checkout.session",
					mode: "subscription",
					customer: "cus_123",
					subscription: "sub_456",
					metadata: { clerkId: "clerk_abc" },
				},
			},
		});

		const response = await postStripeWebhook(t, payload);

		expect(response.status).toBe(200);
		const call = getPostHogCall();
		expect(call).toBeDefined();
		const body = JSON.parse((call?.init?.body as string) ?? "{}");
		expect(body.event).toBe("server_checkout_completed");
		expect(body.distinct_id).toBe("clerk_abc");
		expect(body).not.toHaveProperty("payload");
		const propertyKeys = Object.keys(body.properties);
		for (const key of propertyKeys) {
			expect(key.toLowerCase()).not.toMatch(/card|payment|amount|price/);
		}
		expect(body.properties).toEqual({ clerkId: "clerk_abc" });
	});

	it("sends server_subscription_canceled with the clerkId distinct_id and no payment details on customer.subscription.deleted", async () => {
		vi.stubEnv("STRIPE_SECRET_KEY", STRIPE_SECRET_KEY);
		vi.stubEnv("STRIPE_WEBHOOK_SECRET", STRIPE_WEBHOOK_SECRET);
		vi.stubEnv("POSTHOG_PROJECT_API_KEY", "phc_test");
		vi.stubEnv("POSTHOG_HOST", "https://us.i.posthog.com");
		const t = convexTest(schema, modules);
		await createTestUser(t, {
			clerkId: "clerk_def",
			stripeCustomerId: "cus_789",
			subscriptionTier: "premium",
		});
		const { getPostHogCall } = mockFetch();

		const payload = stripeEventPayload({
			type: "customer.subscription.deleted",
			data: {
				object: {
					id: "sub_789",
					object: "subscription",
					customer: "cus_789",
					status: "canceled",
				},
			},
		});

		const response = await postStripeWebhook(t, payload);

		expect(response.status).toBe(200);
		const call = getPostHogCall();
		expect(call).toBeDefined();
		const body = JSON.parse((call?.init?.body as string) ?? "{}");
		expect(body.event).toBe("server_subscription_canceled");
		expect(body.distinct_id).toBe("clerk_def");
		expect(body).not.toHaveProperty("payload");
		const propertyKeys = Object.keys(body.properties);
		for (const key of propertyKeys) {
			expect(key.toLowerCase()).not.toMatch(/card|payment|amount|price/);
		}
		expect(body.properties).toEqual({ clerkId: "clerk_def" });
	});

	it("does not fail the webhook when the analytics capture fetch rejects", async () => {
		vi.stubEnv("STRIPE_SECRET_KEY", STRIPE_SECRET_KEY);
		vi.stubEnv("STRIPE_WEBHOOK_SECRET", STRIPE_WEBHOOK_SECRET);
		vi.stubEnv("POSTHOG_PROJECT_API_KEY", "phc_test");
		vi.stubEnv("POSTHOG_HOST", "https://us.i.posthog.com");
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const t = convexTest(schema, modules);
		await createTestUser(t, {
			clerkId: "clerk_ghi",
			stripeCustomerId: "cus_999",
			subscriptionTier: "premium",
		});
		mockFetch({
			postHog: () => {
				throw new Error("network down");
			},
		});

		const payload = stripeEventPayload({
			type: "customer.subscription.deleted",
			data: {
				object: {
					id: "sub_999",
					object: "subscription",
					customer: "cus_999",
					status: "canceled",
				},
			},
		});

		const response = await postStripeWebhook(t, payload);
		const text = await response.text();

		expect(response.status).toBe(200);
		expect(text).toBe("OK");

		errorSpy.mockRestore();
	});

	it("does not call PostHog's capture endpoint when POSTHOG env vars are absent", async () => {
		vi.stubEnv("STRIPE_SECRET_KEY", STRIPE_SECRET_KEY);
		vi.stubEnv("STRIPE_WEBHOOK_SECRET", STRIPE_WEBHOOK_SECRET);
		const t = convexTest(schema, modules);
		await createTestUser(t, {
			clerkId: "clerk_jkl",
			stripeCustomerId: "cus_111",
			subscriptionTier: "premium",
		});
		const { fetchMock } = mockFetch();

		const payload = stripeEventPayload({
			type: "customer.subscription.deleted",
			data: {
				object: {
					id: "sub_111",
					object: "subscription",
					customer: "cus_111",
					status: "canceled",
				},
			},
		});

		const response = await postStripeWebhook(t, payload);
		const text = await response.text();

		expect(response.status).toBe(200);
		expect(text).toBe("OK");
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe("handleSubscriptionUpdateResult", () => {
	const baseParams = {
		action: "activate premium",
		customerId: "cus_123",
		subscriptionId: "sub_456",
	};

	it("should return without throwing when result is successful", () => {
		expect(() =>
			handleSubscriptionUpdateResult({
				...baseParams,
				result: { success: true },
			}),
		).not.toThrow();
	});

	it("should log a warning and return (not throw) for USER_NOT_FOUND_ERROR", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		expect(() =>
			handleSubscriptionUpdateResult({
				...baseParams,
				result: { success: false, error: USER_NOT_FOUND_ERROR },
			}),
		).not.toThrow();

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("NON-RETRIABLE"),
		);

		warnSpy.mockRestore();
	});

	it("should throw for unknown errors (triggering 500 retry)", () => {
		expect(() =>
			handleSubscriptionUpdateResult({
				...baseParams,
				result: { success: false, error: "Database timeout" },
			}),
		).toThrow(
			"Failed to activate premium for customer=cus_123, subscription=sub_456: Database timeout",
		);
	});

	it("should throw with 'Unknown error' when error field is missing", () => {
		expect(() =>
			handleSubscriptionUpdateResult({
				...baseParams,
				result: { success: false },
			}),
		).toThrow("Unknown error");
	});
});

describe("handleUnsubscribeRequest", () => {
	it("should return 400 when query params are missing", async () => {
		const ctx = {
			runMutation: vi.fn(),
		};
		const request = new Request("https://example.com/unsubscribe", {
			method: "GET",
		});

		const response = await handleUnsubscribeRequest(ctx, request);
		const text = await response.text();

		expect(response.status).toBe(400);
		expect(text).toContain("Invalid Link");
		expect(ctx.runMutation).not.toHaveBeenCalled();
	});

	it("should render confirmation page on GET without mutating", async () => {
		const ctx = {
			runMutation: vi.fn(),
		};
		const request = new Request(
			"https://example.com/unsubscribe?eventId=events_123&adminToken=token_abc",
			{ method: "GET" },
		);

		const response = await handleUnsubscribeRequest(ctx, request);
		const text = await response.text();

		expect(response.status).toBe(200);
		expect(text).toContain("Confirm unsubscribe");
		expect(text).toContain('method="POST"');
		expect(ctx.runMutation).not.toHaveBeenCalled();
	});

	it("should unsubscribe on valid POST request", async () => {
		const ctx = {
			runMutation: vi.fn().mockResolvedValue({ success: true }),
		};
		const request = new Request("https://example.com/unsubscribe", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				eventId: "events_123",
				adminToken: "token_abc",
			}).toString(),
		});

		const response = await handleUnsubscribeRequest(ctx, request);
		const text = await response.text();

		expect(response.status).toBe(200);
		expect(text).toContain("Unsubscribed");
		expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(), {
			eventId: "events_123",
			adminToken: "token_abc",
		});
	});

	it("should return 400 when mutation returns success=false (invalid link)", async () => {
		const ctx = {
			runMutation: vi.fn().mockResolvedValue({ success: false }),
		};
		const request = new Request("https://example.com/unsubscribe", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				eventId: "not-an-event-id",
				adminToken: "token_abc",
			}).toString(),
		});

		const response = await handleUnsubscribeRequest(ctx, request);
		const text = await response.text();

		expect(response.status).toBe(400);
		expect(text).toContain("invalid or the event no longer exists");
	});

	it("should return 500 when mutation throws", async () => {
		const ctx = {
			runMutation: vi.fn().mockRejectedValue(new Error("db failed")),
		};
		const request = new Request("https://example.com/unsubscribe", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				eventId: "events_123",
				adminToken: "token_abc",
			}).toString(),
		});

		const response = await handleUnsubscribeRequest(ctx, request);
		const text = await response.text();

		expect(response.status).toBe(500);
		expect(text).toContain("Something went wrong");
	});
});
