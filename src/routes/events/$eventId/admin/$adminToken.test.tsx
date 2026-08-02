import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Capture the component passed to createFileRoute
let CapturedComponent: React.ComponentType;

const EVENT_ID = "event-abc";
const ADMIN_TOKEN = "super-secret-admin-token";

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: { component: React.ComponentType }) => {
		CapturedComponent = opts.component;
		return {
			useParams: () => ({ eventId: EVENT_ID, adminToken: ADMIN_TOKEN }),
		};
	},
	useNavigate: () => vi.fn(),
}));

const trackEventMock = vi.fn();
vi.mock("@/lib/analytics-events", () => ({
	trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/EventHeader", () => ({
	EventHeader: () => <div>event-header</div>,
}));

vi.mock("@/components/LinkCopy", () => ({
	LinkCopy: ({ url }: { url: string }) => <div>{url}</div>,
}));

vi.mock("@/components/heatmap/HeatmapGrid", () => ({
	HeatmapGrid: () => <div>heatmap-grid</div>,
}));

vi.mock("@/components/heatmap/DateHeatmapCalendar", () => ({
	DateHeatmapCalendar: () => <div>date-heatmap-calendar</div>,
}));

vi.mock("@/components/ResponsesList", () => ({
	ResponsesList: () => <div>responses-list</div>,
}));

vi.mock("@/components/EditEventDialog", () => ({
	EditEventDialog: () => <div>edit-event-dialog</div>,
}));

vi.mock("@/components/NotFound", () => ({
	NotFound: () => <div>not-found</div>,
}));

vi.mock("@/lib/timezone-display", () => ({
	TimezoneDisplayProvider: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
}));

const exportEventToCsvMock = vi.fn();
vi.mock("@/lib/csv-export", () => ({
	exportEventToCsv: (...args: unknown[]) => exportEventToCsvMock(...args),
}));

const testEvent = {
	_id: EVENT_ID,
	_creationTime: 0,
	title: "Team Sync",
	adminToken: ADMIN_TOKEN,
	dates: ["2025-01-20"],
	timeRangeStart: "09:00",
	timeRangeEnd: "10:00",
	slotDuration: 30,
	timeZone: "UTC",
	isActive: true,
	isPremium: true,
	maxRespondents: 5,
	createdAt: 0,
	updatedAt: 0,
};

const testResponses = [
	{ _id: "r1", eventId: EVENT_ID, respondentName: "Alice", selectedSlots: [] },
	{ _id: "r2", eventId: EVENT_ID, respondentName: "Bob", selectedSlots: [] },
];

// Mutable query results, reassigned per test to drive component state.
let responsesQueryResult: unknown = testResponses;

const deleteEventMutation = vi.fn();

vi.mock("convex/react", () => ({
	// AdminDashboard calls useQuery exactly twice per render, in a fixed
	// order (event, then responses) — index the calls rather than trying
	// to distinguish by args, since both queries take the same shape.
	useQuery: (() => {
		let callCount = 0;
		return () => {
			const isEventQuery = callCount % 2 === 0;
			callCount++;
			return isEventQuery ? testEvent : responsesQueryResult;
		};
	})(),
	// AdminDashboardContent calls useMutation exactly three times per render,
	// in a fixed order: remove response, toggle status, delete event.
	useMutation: (() => {
		let callCount = 0;
		return () => {
			const mutations = [vi.fn(), vi.fn(), deleteEventMutation];
			const mutation = mutations[callCount % 3];
			callCount++;
			return mutation;
		};
	})(),
}));

// Import after mocks to capture the component
await import("./$adminToken");

function renderPage() {
	render(<CapturedComponent />);
}

describe("AdminDashboard analytics", () => {
	afterEach(() => {
		cleanup();
		trackEventMock.mockClear();
		exportEventToCsvMock.mockClear();
		deleteEventMutation.mockClear();
		responsesQueryResult = testResponses;
	});

	it("fires admin_dashboard_viewed exactly once on mount, without the admin token", async () => {
		renderPage();

		await waitFor(() => {
			expect(trackEventMock).toHaveBeenCalledWith("admin_dashboard_viewed", {
				eventId: EVENT_ID,
				responseCount: 2,
			});
		});
		expect(trackEventMock).toHaveBeenCalledTimes(1);

		const [, properties] = trackEventMock.mock.calls[0];
		expect(properties).not.toHaveProperty("adminToken");
	});

	it("fires admin_csv_exported with the response count on export success, not on export failure", () => {
		renderPage();
		trackEventMock.mockClear(); // discard the mount-time admin_dashboard_viewed call

		fireEvent.click(screen.getByRole("button", { name: /Export CSV/ }));

		expect(exportEventToCsvMock).toHaveBeenCalledWith(testEvent, testResponses);
		expect(trackEventMock).toHaveBeenCalledWith("admin_csv_exported", {
			eventId: EVENT_ID,
			responseCount: 2,
		});
		const [, properties] = trackEventMock.mock.calls.find(
			([name]) => name === "admin_csv_exported",
		) as [string, Record<string, unknown>];
		expect(properties).not.toHaveProperty("adminToken");
	});

	it("does not fire admin_csv_exported when the export throws", () => {
		exportEventToCsvMock.mockImplementation(() => {
			throw new Error("boom");
		});

		renderPage();
		trackEventMock.mockClear();

		fireEvent.click(screen.getByRole("button", { name: /Export CSV/ }));

		expect(
			trackEventMock.mock.calls.some(([name]) => name === "admin_csv_exported"),
		).toBe(false);
	});

	it("fires admin_event_deleted with the response count captured before deletion", async () => {
		deleteEventMutation.mockResolvedValue(undefined);

		renderPage();
		trackEventMock.mockClear(); // discard the mount-time admin_dashboard_viewed call

		fireEvent.click(screen.getByRole("button", { name: /^Delete$/ }));
		fireEvent.click(screen.getByRole("button", { name: /Delete Event/ }));

		await waitFor(() => {
			expect(trackEventMock).toHaveBeenCalledWith("admin_event_deleted", {
				eventId: EVENT_ID,
				responseCount: 2,
			});
		});

		const [, properties] = trackEventMock.mock.calls.find(
			([name]) => name === "admin_event_deleted",
		) as [string, Record<string, unknown>];
		expect(properties).not.toHaveProperty("adminToken");
	});
});
