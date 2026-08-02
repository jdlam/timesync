import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseUser = vi.fn();
vi.mock("@clerk/clerk-react", () => ({
	useUser: () => mockUseUser(),
}));

const getOrCreateUser = vi.fn();
const createCheckoutSession = vi.fn();
const createPortalSession = vi.fn();
vi.mock("convex/react", () => ({
	useQuery: () => undefined,
	useMutation: () => getOrCreateUser,
	useAction: (fn: unknown) =>
		fn === "checkout" ? createCheckoutSession : createPortalSession,
}));

// useAction is called twice with different api refs; distinguish via call order
// instead of relying on the mocked module knowing which action is which.
vi.mock("../../convex/_generated/api", () => ({
	api: {
		users: {
			getCurrentUserSubscription: "sub",
			getOrCreateUser: "getOrCreateUser",
		},
		stripe: {
			createCheckoutSession: "checkout",
			createPortalSession: "portal",
		},
	},
}));

const trackEvent = vi.fn();
vi.mock("@/lib/analytics-events", () => ({
	trackEvent: (...args: unknown[]) => trackEvent(...args),
}));

import { useSubscription } from "./useSubscription";

describe("useSubscription upgrade()", () => {
	let hrefSetter: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		hrefSetter = vi.fn();
		vi.stubGlobal("location", {
			origin: "https://timesync.example.com",
			get href() {
				return "";
			},
			set href(value: string) {
				hrefSetter(value);
			},
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.unstubAllGlobals();
	});

	it("fires checkout_started before redirecting to the Stripe checkout URL", async () => {
		mockUseUser.mockReturnValue({ isSignedIn: true, isLoaded: true });
		createCheckoutSession.mockResolvedValue({
			url: "https://checkout.stripe.com/session123",
		});

		const callOrder: string[] = [];
		trackEvent.mockImplementation(() => {
			callOrder.push("trackEvent");
		});
		hrefSetter.mockImplementation(() => {
			callOrder.push("redirect");
		});

		const { result } = renderHook(() => useSubscription());

		await act(async () => {
			await result.current.upgrade();
		});

		expect(callOrder).toEqual(["trackEvent", "redirect"]);
		expect(trackEvent).toHaveBeenCalledWith("checkout_started");
		expect(hrefSetter).toHaveBeenCalledWith(
			"https://checkout.stripe.com/session123",
		);
	});

	it("does not fire checkout_started when checkout session creation fails", async () => {
		mockUseUser.mockReturnValue({ isSignedIn: true, isLoaded: true });
		createCheckoutSession.mockRejectedValue(new Error("Stripe error"));

		const { result } = renderHook(() => useSubscription());

		await act(async () => {
			await expect(result.current.upgrade()).rejects.toThrow("Stripe error");
		});

		expect(trackEvent).not.toHaveBeenCalled();
		expect(hrefSetter).not.toHaveBeenCalled();
	});
});
