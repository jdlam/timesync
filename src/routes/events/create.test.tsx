import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ConvexError } from "convex/values";
import { afterEach, describe, expect, it, vi } from "vitest";

// Capture the component passed to createFileRoute
let CapturedComponent: React.ComponentType;

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: { component: React.ComponentType }) => {
		CapturedComponent = opts.component;
		return {};
	},
	Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	useRouter: () => ({ navigate: vi.fn() }),
}));

const createEventMutation = vi.fn();
vi.mock("convex/react", () => ({
	useMutation: () => createEventMutation,
}));

const mockSubscription = {
	isPremium: false,
	tier: "free" as const,
	isAuthenticated: false,
};
vi.mock("@/hooks/useSubscription", () => ({
	useSubscription: () => mockSubscription,
}));

const trackEvent = vi.fn();
vi.mock("@/lib/analytics-events", () => ({
	trackEvent: (...args: unknown[]) => trackEvent(...args),
}));

// Stub the calendar day-pool picker: its own selection UX is covered
// elsewhere. Exposes buttons that set the "dates" field directly so tests can
// drive validation without simulating real calendar clicks.
vi.mock("@/components/availability-grid/DayPoolPicker", () => ({
	DayPoolPicker: ({
		onSelectedChange,
	}: {
		onSelectedChange: (dates: string[]) => void;
	}) => (
		<div>
			<button type="button" onClick={() => onSelectedChange(["2099-01-01"])}>
				select-one-date
			</button>
			<button
				type="button"
				onClick={() => onSelectedChange(["2099-01-01", "2099-06-01"])}
			>
				select-wide-span-dates
			</button>
		</div>
	),
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));
const { toast } = await import("sonner");

// Import after mocks to capture the component
await import("./create");

function renderPage() {
	render(<CapturedComponent />);
}

function fillTitle() {
	fireEvent.change(screen.getByPlaceholderText("Team Meeting"), {
		target: { value: "Team Sync" },
	});
}

function switchToDatesMode() {
	fireEvent.click(screen.getByRole("button", { name: /Dates/ }));
}

function submitForm() {
	fireEvent.click(screen.getByRole("button", { name: "Create Event" }));
}

describe("CreateEvent analytics", () => {
	afterEach(() => {
		cleanup();
		trackEvent.mockClear();
		createEventMutation.mockReset();
		mockSubscription.isPremium = false;
		mockSubscription.tier = "free";
		mockSubscription.isAuthenticated = false;
	});

	it("fires event_create_started exactly once across two separate field interactions", () => {
		renderPage();

		fillTitle();
		switchToDatesMode();

		const startedCalls = trackEvent.mock.calls.filter(
			([name]) => name === "event_create_started",
		);
		expect(startedCalls).toHaveLength(1);
		expect(startedCalls[0][1]).toEqual({
			eventMode: "times",
			isAuthenticated: false,
		});
	});

	it("fires event_create_mode_selected with the new and previous mode", () => {
		renderPage();

		switchToDatesMode();

		expect(trackEvent).toHaveBeenCalledWith("event_create_mode_selected", {
			eventMode: "dates",
			previousMode: "times",
		});
	});

	it("fires event_create_tier_limit_hit when the date-span tier-limit error appears", async () => {
		renderPage();

		fillTitle();
		switchToDatesMode();
		fireEvent.click(
			screen.getByRole("button", { name: "select-wide-span-dates" }),
		);
		submitForm();

		await screen.findByText(/Dates can span at most/);

		const tierLimitCalls = trackEvent.mock.calls.filter(
			([name]) => name === "event_create_tier_limit_hit",
		);
		expect(tierLimitCalls).toHaveLength(1);
		expect(tierLimitCalls[0][1]).toEqual({
			limitType: "maxDateSpanDays",
			tier: "free",
			attemptedValue: 152,
		});
	});

	it("does not fire event_create_tier_limit_hit for a non-tier validation error", async () => {
		renderPage();

		fillTitle();
		// Leave "dates" empty -> "At least one date is required" (not a tier
		// limit message).
		submitForm();

		await screen.findByText(/At least one date is required/);

		expect(trackEvent).not.toHaveBeenCalledWith(
			"event_create_tier_limit_hit",
			expect.anything(),
		);
	});

	it("fires event_create_submitted then event_create_completed on successful creation, without leaking the admin token", async () => {
		createEventMutation.mockResolvedValue({
			eventId: "event-123",
			adminToken: "secret-admin-token",
		});
		renderPage();

		fillTitle();
		// "times" mode's built-in calendar isn't mocked; switch to dates mode
		// (individual pattern) so DayPoolPicker's stub can supply a valid date.
		switchToDatesMode();
		fireEvent.click(screen.getByRole("button", { name: "select-one-date" }));
		submitForm();

		await screen.findByText("Event Created Successfully!");

		const eventNames = trackEvent.mock.calls.map(([name]) => name);
		expect(eventNames.indexOf("event_create_submitted")).toBeGreaterThanOrEqual(
			0,
		);
		expect(eventNames.indexOf("event_create_completed")).toBeGreaterThan(
			eventNames.indexOf("event_create_submitted"),
		);

		const completedCall = trackEvent.mock.calls.find(
			([name]) => name === "event_create_completed",
		);
		expect(completedCall?.[1]).toEqual({
			eventId: "event-123",
			eventMode: "dates",
			isAuthenticated: false,
		});

		for (const call of trackEvent.mock.calls) {
			expect(JSON.stringify(call[1])).not.toContain("adminToken");
			expect(JSON.stringify(call[1])).not.toContain("secret-admin-token");
		}
	});

	it("shows the ConvexError message and tracks its error code on mutation failure", async () => {
		createEventMutation.mockRejectedValue(
			new ConvexError({
				code: "too_many_dates",
				message: "Must have between 1 and 30 dates",
			}),
		);
		renderPage();

		fillTitle();
		switchToDatesMode();
		fireEvent.click(screen.getByRole("button", { name: "select-one-date" }));
		submitForm();

		await vi.waitFor(() => {
			expect(trackEvent).toHaveBeenCalledWith("event_create_failed", {
				errorCode: "too_many_dates",
				eventMode: "dates",
			});
		});
		expect(toast.error).toHaveBeenCalledWith(
			"Must have between 1 and 30 dates",
		);
	});

	it("shows the ConvexError message but tracks unknown_error when code is missing", async () => {
		createEventMutation.mockRejectedValue(
			new ConvexError({
				message: "Some user-safe message",
			}),
		);
		renderPage();

		fillTitle();
		switchToDatesMode();
		fireEvent.click(screen.getByRole("button", { name: "select-one-date" }));
		submitForm();

		await vi.waitFor(() => {
			expect(trackEvent).toHaveBeenCalledWith("event_create_failed", {
				errorCode: "unknown_error",
				eventMode: "dates",
			});
		});
		expect(toast.error).toHaveBeenCalledWith("Some user-safe message");
	});

	it("shows a generic message and tracks unknown_error for an unstructured/redacted failure", async () => {
		createEventMutation.mockRejectedValue(
			new Error("[CONVEX M(events:create)] [Request ID: abc123] Server Error"),
		);
		renderPage();

		fillTitle();
		switchToDatesMode();
		fireEvent.click(screen.getByRole("button", { name: "select-one-date" }));
		submitForm();

		await vi.waitFor(() => {
			expect(trackEvent).toHaveBeenCalledWith("event_create_failed", {
				errorCode: "unknown_error",
				eventMode: "dates",
			});
		});
		expect(toast.error).toHaveBeenCalledWith(
			"Failed to create event. Please try again.",
		);
		expect(toast.error).not.toHaveBeenCalledWith(
			expect.stringContaining("Request ID"),
		);
	});
});
