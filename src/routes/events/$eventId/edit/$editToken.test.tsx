import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "@/lib/analytics-events";

const EVENT_ID = "event-abc";
const EDIT_TOKEN = "token-1";

let CapturedComponent: React.ComponentType;

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: { component: React.ComponentType }) => {
		CapturedComponent = opts.component;
		return { useParams: () => ({ eventId: EVENT_ID, editToken: EDIT_TOKEN }) };
	},
}));

vi.mock("@/lib/analytics-events", () => ({
	trackEvent: vi.fn(),
}));

vi.mock("@/components/EventHeader", () => ({
	EventHeader: () => <div>event-header</div>,
}));

vi.mock("@/components/EditResponseForm", () => ({
	EditResponseForm: () => <div>edit-response-form</div>,
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

const testResponse = {
	_id: "resp-1",
	eventId: EVENT_ID,
	respondentName: "Alice",
	respondentComment: "",
	selectedSlots: ["2025-01-20T09:00:00.000Z"],
	editToken: EDIT_TOKEN,
	createdAt: 0,
	updatedAt: 0,
};

let eventQueryResult: unknown;
let responseQueryResult: unknown;

vi.mock("convex/react", () => ({
	// EditResponseWrapper calls useQuery exactly twice per render, in a fixed
	// order (event, then response) — index the calls rather than trying to
	// distinguish by args, since both queries take the same `{ eventId,
	// editToken }` shape and `api.x.y` references from convex's `anyApi` proxy
	// are never reference-equal across separate property accesses.
	useQuery: (() => {
		let callCount = 0;
		return () => {
			const isEventQuery = callCount % 2 === 0;
			callCount++;
			return isEventQuery ? eventQueryResult : responseQueryResult;
		};
	})(),
}));

await import("./$editToken");

function renderPage() {
	render(<CapturedComponent />);
}

describe("EditResponseWrapper — analytics events", () => {
	beforeEach(() => {
		eventQueryResult = testEvent;
		responseQueryResult = testResponse;
		vi.clearAllMocks();
	});

	afterEach(() => cleanup());

	it("fires response_edit_viewed once event and response have loaded", () => {
		renderPage();

		expect(trackEvent).toHaveBeenCalledWith("response_edit_viewed", {
			eventId: EVENT_ID,
		});
	});

	it("never includes editToken in the tracked event's properties (token-leak regression)", () => {
		renderPage();

		expect(vi.mocked(trackEvent).mock.calls.length).toBeGreaterThan(0);
		for (const [, properties] of vi.mocked(trackEvent).mock.calls) {
			expect(properties).not.toHaveProperty("editToken");
			expect(properties).not.toHaveProperty("password");
		}
	});
});
