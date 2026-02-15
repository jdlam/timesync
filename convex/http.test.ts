import { describe, expect, it, vi } from "vitest";
import { handleSubscriptionUpdateResult } from "./http";
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
