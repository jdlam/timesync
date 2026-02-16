import { describe, expect, it, vi } from "vitest";
import { handleSubscriptionUpdateResult, handleUnsubscribeRequest } from "./http";
import { USER_NOT_FOUND_ERROR } from "./users";

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
