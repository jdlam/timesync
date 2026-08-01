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

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: { component: React.ComponentType }) => {
		CapturedComponent = opts.component;
		return {};
	},
	useSearch: () => searchParams,
}));

let searchParams: { eventId?: string; token?: string } = {
	eventId: "event-1",
	token: "token-1",
};

let infoQueryResult: unknown;
const unsubscribeMutation = vi.fn();
const resubscribeMutation = vi.fn();

vi.mock("convex/react", () => ({
	useQuery: (_fn: unknown, args: unknown) => {
		if (args === "skip") return undefined;
		return infoQueryResult;
	},
	useMutation: (fn: unknown) => {
		// Distinguish by function identity via a marker set on the api mock below.
		if ((fn as { __name?: string }).__name === "unsubscribe") {
			return unsubscribeMutation;
		}
		return resubscribeMutation;
	},
}));

vi.mock("../../convex/_generated/api", () => ({
	api: {
		email: {
			getUnsubscribeInfo: { __name: "getUnsubscribeInfo" },
			unsubscribe: { __name: "unsubscribe" },
			resubscribe: { __name: "resubscribe" },
		},
	},
}));

// Import after mocks to capture the component
await import("./unsubscribe");

function renderPage() {
	render(<CapturedComponent />);
}

describe("UnsubscribeRoute", () => {
	afterEach(() => {
		cleanup();
		searchParams = { eventId: "event-1", token: "token-1" };
		infoQueryResult = undefined;
		unsubscribeMutation.mockReset();
		resubscribeMutation.mockReset();
	});

	it("shows an invalid link card when eventId or token is missing from the URL, so a stale/forwarded link never crashes", () => {
		searchParams = { eventId: undefined, token: "token-1" };

		renderPage();

		expect(screen.getByText("Invalid link")).toBeDefined();
	});

	it("shows a loading state while the event lookup is in flight", () => {
		infoQueryResult = undefined;

		renderPage();

		expect(document.querySelector(".animate-spin")).not.toBeNull();
	});

	it("shows an invalid link card when the token does not resolve to an event", () => {
		infoQueryResult = null;

		renderPage();

		expect(screen.getByText("Invalid link")).toBeDefined();
	});

	it("asks for confirmation before unsubscribing, naming the event", () => {
		infoQueryResult = { title: "Team Sync", notifyOnResponse: true };

		renderPage();

		expect(
			screen.getByText('Stop email notifications for "Team Sync"?'),
		).toBeDefined();
		expect(
			screen.getByRole("button", { name: "Confirm unsubscribe" }),
		).toBeDefined();
	});

	it("skips the confirm step and shows the unsubscribed state directly when already unsubscribed", () => {
		infoQueryResult = { title: "Team Sync", notifyOnResponse: false };

		renderPage();

		expect(screen.getByText("You're unsubscribed")).toBeDefined();
		expect(
			screen.getByRole("button", { name: "Re-enable notifications" }),
		).toBeDefined();
		expect(
			screen.queryByRole("button", { name: "Confirm unsubscribe" }),
		).toBeNull();
	});

	it("shows a clear success confirmation naming the event after confirming unsubscribe, with a re-enable option", async () => {
		infoQueryResult = { title: "Team Sync", notifyOnResponse: true };
		unsubscribeMutation.mockResolvedValue({ success: true });

		renderPage();
		fireEvent.click(
			screen.getByRole("button", { name: "Confirm unsubscribe" }),
		);

		await waitFor(() => {
			expect(screen.getByText("You're unsubscribed")).toBeDefined();
		});
		expect(unsubscribeMutation).toHaveBeenCalledWith({
			eventId: "event-1",
			token: "token-1",
		});
		expect(
			screen.getByRole("button", { name: "Re-enable notifications" }),
		).toBeDefined();
	});

	it("confirms notifications are back on after resubscribing, with the ability to turn them off again", async () => {
		infoQueryResult = { title: "Team Sync", notifyOnResponse: false };
		resubscribeMutation.mockResolvedValue({ success: true });

		renderPage();
		fireEvent.click(
			screen.getByRole("button", { name: "Re-enable notifications" }),
		);

		await waitFor(() => {
			expect(screen.getByText("Notifications are back on")).toBeDefined();
		});
		expect(resubscribeMutation).toHaveBeenCalledWith({
			eventId: "event-1",
			token: "token-1",
		});
		expect(
			screen.getByRole("button", { name: "Turn off again" }),
		).toBeDefined();
	});

	it("shows a retryable error card when the unsubscribe mutation reports failure", async () => {
		infoQueryResult = { title: "Team Sync", notifyOnResponse: true };
		unsubscribeMutation.mockResolvedValue({ success: false });

		renderPage();
		fireEvent.click(
			screen.getByRole("button", { name: "Confirm unsubscribe" }),
		);

		await waitFor(() => {
			expect(screen.getByText("Something went wrong")).toBeDefined();
		});
		expect(screen.getByRole("button", { name: "Try again" })).toBeDefined();
	});

	it("shows a retryable error card when the unsubscribe mutation throws", async () => {
		infoQueryResult = { title: "Team Sync", notifyOnResponse: true };
		unsubscribeMutation.mockRejectedValue(new Error("network error"));

		renderPage();
		fireEvent.click(
			screen.getByRole("button", { name: "Confirm unsubscribe" }),
		);

		await waitFor(() => {
			expect(screen.getByText("Something went wrong")).toBeDefined();
		});
	});

	it("retries the failed action when Try again is clicked", async () => {
		infoQueryResult = { title: "Team Sync", notifyOnResponse: true };
		unsubscribeMutation
			.mockResolvedValueOnce({ success: false })
			.mockResolvedValueOnce({ success: true });

		renderPage();
		fireEvent.click(
			screen.getByRole("button", { name: "Confirm unsubscribe" }),
		);
		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Try again" })).toBeDefined();
		});

		fireEvent.click(screen.getByRole("button", { name: "Try again" }));

		await waitFor(() => {
			expect(screen.getByText("You're unsubscribed")).toBeDefined();
		});
		expect(unsubscribeMutation).toHaveBeenCalledTimes(2);
	});
});
