import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "@/lib/analytics-events";

vi.mock("@/lib/analytics-events", () => ({
	trackEvent: vi.fn(),
}));

// Capture the component passed to createFileRoute
let CapturedComponent: React.ComponentType;

const EVENT_ID = "event-abc";

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: { component: React.ComponentType }) => {
		CapturedComponent = opts.component;
		return { useParams: () => ({ eventId: EVENT_ID }) };
	},
}));

const testEvent = {
	_id: EVENT_ID,
	_creationTime: 0,
	title: "Team Sync",
	dates: ["2025-01-20"],
	timeRangeStart: "09:00",
	timeRangeEnd: "10:00",
	slotDuration: 30,
	timeZone: "UTC",
	isActive: true,
	maxRespondents: 5,
	createdAt: 0,
	updatedAt: 0,
};

// Mutable query results, reassigned per test to drive component state.
let eventQueryResult: unknown;
let editTokenQueryResult: unknown;

// Slots the stubbed grid reports when the user "selects" times.
const GRID_SLOTS = ["2025-01-20T09:00:00.000Z"];

const submitMutation = vi.fn();

vi.mock("convex/react", () => ({
	useQuery: (_fn: unknown, args: unknown) => {
		if (args === "skip") return undefined;
		if (args && typeof args === "object" && "editToken" in args) {
			return editTokenQueryResult;
		}
		return eventQueryResult;
	},
	useMutation: () => submitMutation,
}));

// Stub the grid: it is heavy and its selection behaviour is covered elsewhere.
vi.mock("@/components/availability-grid/AvailabilityGrid", () => ({
	AvailabilityGrid: ({ onChange }: { onChange: (slots: string[]) => void }) => (
		<button type="button" onClick={() => onChange(GRID_SLOTS)}>
			select-slots
		</button>
	),
}));

vi.mock("@/components/availability-grid/DateAvailabilityCalendar", () => ({
	DateAvailabilityCalendar: ({
		onChange,
	}: {
		onChange: (slots: string[]) => void;
	}) => (
		<button type="button" onClick={() => onChange(GRID_SLOTS)}>
			select-days
		</button>
	),
}));

vi.mock("@/components/EventHeader", () => ({
	EventHeader: () => <div>event-header</div>,
}));

vi.mock("@/components/LinkCopy", () => ({
	LinkCopy: ({ url }: { url: string }) => <div>{url}</div>,
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

// Import after mocks to capture the component
await import("./index");

function storedKey() {
	return `response-${EVENT_ID}`;
}

function renderPage() {
	render(<CapturedComponent />);
}

describe("EventResponse — duplicate submission prevention", () => {
	beforeEach(() => {
		eventQueryResult = {
			event: testEvent,
			responseCount: 1,
			isPasswordProtected: false,
		};
		editTokenQueryResult = undefined;
		submitMutation.mockReset();
	});

	afterEach(() => {
		cleanup();
		localStorage.clear();
	});

	it("shows the submit form when this browser has not responded to the event", () => {
		renderPage();

		expect(screen.getByText("Select Your Availability")).toBeDefined();
		expect(screen.queryByText("Update Your Availability")).toBeNull();
	});

	it("edits the existing response instead of offering a second submission when this browser already responded", () => {
		localStorage.setItem(
			storedKey(),
			JSON.stringify({ responseId: "resp-1", editToken: "token-1" }),
		);
		editTokenQueryResult = {
			_id: "resp-1",
			eventId: EVENT_ID,
			respondentName: "Alice",
			respondentComment: "",
			selectedSlots: GRID_SLOTS,
			editToken: "token-1",
			createdAt: 0,
			updatedAt: 0,
		};

		renderPage();

		// The edit form, not the submit form — a second submit would consume
		// another respondent slot.
		expect(screen.getByText("Update Your Availability")).toBeDefined();
		expect(screen.queryByText("Select Your Availability")).toBeNull();
		expect(
			screen.getByRole("button", { name: /Update Response/ }),
		).toBeDefined();
		expect(
			screen.queryByRole("button", { name: /Submit Availability/ }),
		).toBeNull();
	});

	it("prefills the previous answer so updating does not silently wipe it", () => {
		localStorage.setItem(
			storedKey(),
			JSON.stringify({ responseId: "resp-1", editToken: "token-1" }),
		);
		editTokenQueryResult = {
			_id: "resp-1",
			eventId: EVENT_ID,
			respondentName: "Alice",
			respondentComment: "Prefer mornings",
			selectedSlots: GRID_SLOTS,
			editToken: "token-1",
			createdAt: 0,
			updatedAt: 0,
		};

		renderPage();

		expect((screen.getByLabelText(/Your Name/) as HTMLInputElement).value).toBe(
			"Alice",
		);
		expect(
			(screen.getByLabelText(/Comment/) as HTMLTextAreaElement).value,
		).toBe("Prefer mornings");
	});

	it("falls back to submitting when the saved response was deleted by the admin", async () => {
		localStorage.setItem(
			storedKey(),
			JSON.stringify({ responseId: "resp-1", editToken: "stale-token" }),
		);
		editTokenQueryResult = null; // server says: no such response

		renderPage();

		await waitFor(() => {
			expect(screen.getByText("Select Your Availability")).toBeDefined();
		});
		// The unusable token is forgotten so it cannot strand the visitor.
		expect(localStorage.getItem(storedKey())).toBeNull();
	});

	it("remembers the response after submitting, so submitting again edits it rather than duplicating", async () => {
		submitMutation.mockImplementation(async () => {
			// Simulate the server: the response now exists and is fetchable.
			editTokenQueryResult = {
				_id: "resp-new",
				eventId: EVENT_ID,
				respondentName: "Bob",
				respondentComment: "",
				selectedSlots: GRID_SLOTS,
				editToken: "token-new",
				createdAt: 0,
				updatedAt: 0,
			};
			return { responseId: "resp-new", editToken: "token-new" };
		});

		renderPage();

		fireEvent.click(screen.getByRole("button", { name: "select-slots" }));
		fireEvent.change(screen.getByLabelText(/Your Name/), {
			target: { value: "Bob" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: /Submit Availability/ }),
		);

		await waitFor(() => {
			expect(localStorage.getItem(storedKey())).toBe(
				JSON.stringify({ responseId: "resp-new", editToken: "token-new" }),
			);
		});

		// The page is now in edit mode, so a second click updates rather than
		// creating a duplicate response.
		await waitFor(() => {
			expect(screen.getByText("Update Your Availability")).toBeDefined();
		});
		expect(screen.queryByText("Select Your Availability")).toBeNull();
		expect(submitMutation).toHaveBeenCalledTimes(1);
	});

	it("lets a shared browser start a fresh response, so one device is not locked to one person", async () => {
		localStorage.setItem(
			storedKey(),
			JSON.stringify({ responseId: "resp-1", editToken: "token-1" }),
		);
		editTokenQueryResult = {
			_id: "resp-1",
			eventId: EVENT_ID,
			respondentName: "Alice",
			respondentComment: "",
			selectedSlots: GRID_SLOTS,
			editToken: "token-1",
			createdAt: 0,
			updatedAt: 0,
		};

		renderPage();

		fireEvent.click(screen.getByRole("button", { name: /Not Alice\?/ }));

		await waitFor(() => {
			expect(screen.getByText("Select Your Availability")).toBeDefined();
		});
		expect(localStorage.getItem(storedKey())).toBeNull();
	});

	// A dates-only event has no time grid; rendering AvailabilityGrid would show
	// time slots the event has no schedule for and submit slots the server
	// rejects.
	describe("dates-only events", () => {
		const datesEvent = { ...testEvent, eventMode: "dates" as const };

		it("renders the day calendar, not the time grid, when submitting", () => {
			eventQueryResult = {
				event: datesEvent,
				responseCount: 1,
				isPasswordProtected: false,
			};

			renderPage();

			expect(screen.getByRole("button", { name: "select-days" })).toBeDefined();
			expect(screen.queryByRole("button", { name: "select-slots" })).toBeNull();
			expect(
				screen.getByText("Select the days when you're available."),
			).toBeDefined();
		});

		it("renders the day calendar when editing an already-submitted response", () => {
			eventQueryResult = {
				event: datesEvent,
				responseCount: 1,
				isPasswordProtected: false,
			};
			localStorage.setItem(
				storedKey(),
				JSON.stringify({ responseId: "resp-1", editToken: "token-1" }),
			);
			editTokenQueryResult = {
				_id: "resp-1",
				eventId: EVENT_ID,
				respondentName: "Alice",
				respondentComment: "",
				selectedSlots: GRID_SLOTS,
				editToken: "token-1",
				createdAt: 0,
				updatedAt: 0,
			};

			renderPage();

			expect(screen.getByText("Update Your Availability")).toBeDefined();
			expect(screen.getByRole("button", { name: "select-days" })).toBeDefined();
			expect(screen.queryByRole("button", { name: "select-slots" })).toBeNull();
		});
	});

	it("keeps each event's memory separate so responding to one does not lock another", () => {
		localStorage.setItem(
			"response-some-other-event",
			JSON.stringify({ responseId: "resp-1", editToken: "token-1" }),
		);

		renderPage();

		expect(screen.getByText("Select Your Availability")).toBeDefined();
	});
});

describe("EventResponse — analytics events", () => {
	beforeEach(() => {
		eventQueryResult = {
			event: testEvent,
			responseCount: 1,
			isPasswordProtected: false,
		};
		editTokenQueryResult = undefined;
		submitMutation.mockReset();
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
		localStorage.clear();
	});

	it("fires event_page_viewed on mount with isReturningRespondent false for a first-time visitor", () => {
		renderPage();

		expect(trackEvent).toHaveBeenCalledWith("event_page_viewed", {
			eventId: EVENT_ID,
			isReturningRespondent: false,
			eventMode: "times",
		});
	});

	it("fires event_page_viewed on mount with isReturningRespondent true for a returning respondent", () => {
		localStorage.setItem(
			storedKey(),
			JSON.stringify({ responseId: "resp-1", editToken: "token-1" }),
		);
		editTokenQueryResult = {
			_id: "resp-1",
			eventId: EVENT_ID,
			respondentName: "Alice",
			respondentComment: "",
			selectedSlots: GRID_SLOTS,
			editToken: "token-1",
			createdAt: 0,
			updatedAt: 0,
		};

		renderPage();

		expect(trackEvent).toHaveBeenCalledWith("event_page_viewed", {
			eventId: EVENT_ID,
			isReturningRespondent: true,
			eventMode: "times",
		});
	});

	it("fires response_submit_attempted then response_submit_completed with slotCount and hasComment", async () => {
		submitMutation.mockResolvedValue({
			responseId: "resp-new",
			editToken: "token-new",
		});

		renderPage();

		fireEvent.click(screen.getByRole("button", { name: "select-slots" }));
		fireEvent.change(screen.getByLabelText(/Your Name/), {
			target: { value: "Bob" },
		});
		fireEvent.change(screen.getByLabelText(/Comment/), {
			target: { value: "See you there" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: /Submit Availability/ }),
		);

		await waitFor(() => {
			expect(trackEvent).toHaveBeenCalledWith("response_submit_completed", {
				eventId: EVENT_ID,
				slotCount: GRID_SLOTS.length,
			});
		});

		expect(trackEvent).toHaveBeenCalledWith("response_submit_attempted", {
			eventId: EVENT_ID,
			slotCount: GRID_SLOTS.length,
			hasComment: true,
		});
	});

	it("fires response_submit_failed with errorType 'max_respondents' when the mutation rejects with the max-respondents message", async () => {
		submitMutation.mockRejectedValue(
			new Error("Maximum number of respondents reached"),
		);

		renderPage();

		fireEvent.click(screen.getByRole("button", { name: "select-slots" }));
		fireEvent.change(screen.getByLabelText(/Your Name/), {
			target: { value: "Bob" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: /Submit Availability/ }),
		);

		await waitFor(() => {
			expect(trackEvent).toHaveBeenCalledWith("response_submit_failed", {
				eventId: EVENT_ID,
				errorType: "max_respondents",
			});
		});
	});

	it("fires response_submit_failed with errorType 'other' for any other mutation error", async () => {
		submitMutation.mockRejectedValue(new Error("Network error"));

		renderPage();

		fireEvent.click(screen.getByRole("button", { name: "select-slots" }));
		fireEvent.change(screen.getByLabelText(/Your Name/), {
			target: { value: "Bob" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: /Submit Availability/ }),
		);

		await waitFor(() => {
			expect(trackEvent).toHaveBeenCalledWith("response_submit_failed", {
				eventId: EVENT_ID,
				errorType: "other",
			});
		});
	});

	it("never includes editToken or password in any tracked event's properties (token-leak regression)", async () => {
		localStorage.setItem(
			storedKey(),
			JSON.stringify({ responseId: "resp-1", editToken: "token-1" }),
		);
		editTokenQueryResult = {
			_id: "resp-1",
			eventId: EVENT_ID,
			respondentName: "Alice",
			respondentComment: "",
			selectedSlots: GRID_SLOTS,
			editToken: "token-1",
			createdAt: 0,
			updatedAt: 0,
		};

		renderPage();

		await waitFor(() => {
			expect(trackEvent).toHaveBeenCalledWith(
				"response_edit_viewed",
				expect.anything(),
			);
		});

		expect(vi.mocked(trackEvent).mock.calls.length).toBeGreaterThan(0);
		for (const [, properties] of vi.mocked(trackEvent).mock.calls) {
			if (properties && typeof properties === "object") {
				expect(properties).not.toHaveProperty("editToken");
				expect(properties).not.toHaveProperty("password");
			}
		}
	});

	it("fires event_password_required_shown exactly once when the password gate renders", () => {
		eventQueryResult = {
			passwordRequired: true,
			eventTitle: "Team Sync",
			wrongPassword: false,
		};

		renderPage();

		const calls = vi
			.mocked(trackEvent)
			.mock.calls.filter(([name]) => name === "event_password_required_shown");
		expect(calls).toHaveLength(1);
		expect(calls[0][1]).toEqual({ eventId: EVENT_ID });
	});

	it("never fires event_password_required_shown when the password gate is not shown", () => {
		renderPage();

		expect(trackEvent).not.toHaveBeenCalledWith(
			"event_password_required_shown",
			expect.anything(),
		);
	});
});
