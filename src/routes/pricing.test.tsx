import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Capture the component passed to createFileRoute
let CapturedComponent: React.ComponentType;

const mockSearch: { success: boolean; canceled: boolean; from?: string } = {
	success: false,
	canceled: false,
};

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: { component: React.ComponentType }) => {
		CapturedComponent = opts.component;
		return {};
	},
	useSearch: () => mockSearch,
}));

const trackEvent = vi.fn();
vi.mock("@/lib/analytics-events", () => ({
	trackEvent: (...args: unknown[]) => trackEvent(...args),
}));

vi.mock("@clerk/clerk-react", () => ({
	useUser: () => ({ isSignedIn: true }),
	SignInButton: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
}));

const mockSubscription = {
	isPremium: false,
	isSuperAdmin: false,
	isLoading: false,
	tier: "free" as const,
	isAuthenticated: true,
	subscriptionId: null,
	expiresAt: null,
	upgrade: vi.fn(),
	manageSubscription: vi.fn(),
	syncUser: vi.fn(),
};

vi.mock("@/hooks/useSubscription", () => ({
	useSubscription: () => mockSubscription,
}));

// Import after mocks to capture the component
await import("./pricing");

describe("PricingPage", () => {
	afterEach(() => {
		cleanup();
		mockSubscription.isPremium = false;
		mockSubscription.isSuperAdmin = false;
		mockSubscription.isLoading = false;
		mockSearch.success = false;
		mockSearch.canceled = false;
		mockSearch.from = undefined;
		trackEvent.mockClear();
	});

	it("should show 'Admin Access' disabled button for super admins", () => {
		mockSubscription.isPremium = true;
		mockSubscription.isSuperAdmin = true;

		render(<CapturedComponent />);

		const button = screen.getByRole("button", { name: "Admin Access" });
		expect(button).toBeDefined();
		expect((button as HTMLButtonElement).disabled).toBe(true);
		expect(
			screen.queryByRole("button", { name: "Manage Subscription" }),
		).toBeNull();
	});

	it("should show 'Manage Subscription' button for premium users", () => {
		mockSubscription.isPremium = true;
		mockSubscription.isSuperAdmin = false;

		render(<CapturedComponent />);

		const button = screen.getByRole("button", {
			name: "Manage Subscription",
		});
		expect(button).toBeDefined();
		expect((button as HTMLButtonElement).disabled).toBe(false);
		expect(screen.queryByRole("button", { name: "Admin Access" })).toBeNull();
	});

	it("should show 'Upgrade to Premium' for signed-in free users", () => {
		mockSubscription.isPremium = false;
		mockSubscription.isSuperAdmin = false;

		render(<CapturedComponent />);

		expect(
			screen.getByRole("button", { name: "Upgrade to Premium" }),
		).toBeDefined();
	});

	it("should disable upgrade button while checkout is starting", async () => {
		mockSubscription.isPremium = false;
		mockSubscription.isSuperAdmin = false;
		mockSubscription.upgrade = vi.fn(async () => {
			await new Promise(() => {});
		});

		render(<CapturedComponent />);

		const button = screen.getByRole("button", { name: "Upgrade to Premium" });
		fireEvent.click(button);

		expect(
			screen.getByRole("button", { name: "Redirecting..." }),
		).toBeDefined();
		expect(
			(
				screen.getByRole("button", {
					name: "Redirecting...",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
	});

	it("should show 'Loading...' when subscription is loading", () => {
		mockSubscription.isLoading = true;

		render(<CapturedComponent />);

		expect(screen.getByRole("button", { name: "Loading..." })).toBeDefined();
	});

	it("fires pricing_page_viewed once on mount with referrerContext defaulting to 'direct'", () => {
		render(<CapturedComponent />);

		const calls = trackEvent.mock.calls.filter(
			([name]) => name === "pricing_page_viewed",
		);
		expect(calls).toHaveLength(1);
		expect(calls[0][1]).toEqual({
			isAuthenticated: true,
			isPremium: false,
			referrerContext: "direct",
		});
	});

	it("fires pricing_page_viewed with referrerContext from the ?from= search param", () => {
		mockSearch.from = "create_form";

		render(<CapturedComponent />);

		const calls = trackEvent.mock.calls.filter(
			([name]) => name === "pricing_page_viewed",
		);
		expect(calls).toHaveLength(1);
		expect(calls[0][1]).toEqual({
			isAuthenticated: true,
			isPremium: false,
			referrerContext: "create_form",
		});
	});

	it("fires pricing_upgrade_clicked with isAuthenticated before upgrade() is called", async () => {
		mockSubscription.isPremium = false;
		mockSubscription.isSuperAdmin = false;
		mockSubscription.upgrade = vi.fn(async () => {});

		render(<CapturedComponent />);

		fireEvent.click(screen.getByRole("button", { name: "Upgrade to Premium" }));

		expect(trackEvent).toHaveBeenCalledWith("pricing_upgrade_clicked", {
			isAuthenticated: true,
		});
	});

	it("fires checkout_canceled when the canceled search param is present", () => {
		mockSearch.canceled = true;

		render(<CapturedComponent />);

		expect(trackEvent).toHaveBeenCalledWith("checkout_canceled");
	});

	it("does not fire checkout_canceled on a plain page view", () => {
		render(<CapturedComponent />);

		expect(trackEvent).not.toHaveBeenCalledWith("checkout_canceled");
	});

	it("never includes tokens or emails in tracked event properties", () => {
		mockSearch.from = "create_form";
		mockSearch.canceled = true;

		render(<CapturedComponent />);

		for (const [, properties] of trackEvent.mock.calls) {
			const serialized = JSON.stringify(properties ?? {});
			expect(serialized).not.toMatch(/token/i);
			expect(serialized).not.toMatch(/@/);
		}
	});
});
