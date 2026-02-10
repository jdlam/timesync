import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Capture the component passed to createFileRoute
let CapturedComponent: React.ComponentType;

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: { component: React.ComponentType }) => {
		CapturedComponent = opts.component;
		return {};
	},
	useSearch: () => ({ success: false, canceled: false }),
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

	it("should show 'Loading...' when subscription is loading", () => {
		mockSubscription.isLoading = true;

		render(<CapturedComponent />);

		expect(screen.getByRole("button", { name: "Loading..." })).toBeDefined();
	});
});
