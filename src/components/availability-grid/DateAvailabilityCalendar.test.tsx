import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "@/lib/analytics-events";
import type { PublicEvent } from "../../../convex/shared_types";
import { DateAvailabilityCalendar } from "./DateAvailabilityCalendar";

vi.mock("@/lib/analytics-events", () => ({
	trackEvent: vi.fn(),
}));

// Minimal dates-only event (UTC so canonical slots are midnight-Z).
const event = {
	_id: "event123",
	timeZone: "UTC",
	eventMode: "dates",
	dates: ["2025-08-01", "2025-08-02", "2025-08-03"],
} as unknown as PublicEvent;

describe("DateAvailabilityCalendar", () => {
	beforeEach(() => vi.clearAllMocks());
	afterEach(() => cleanup());

	it("selects and clears all candidate days", () => {
		const onChange = vi.fn();
		render(<DateAvailabilityCalendar event={event} onChange={onChange} />);

		fireEvent.click(screen.getByRole("button", { name: "Select all" }));
		expect(onChange).toHaveBeenLastCalledWith([
			"2025-08-01T00:00:00.000Z",
			"2025-08-02T00:00:00.000Z",
			"2025-08-03T00:00:00.000Z",
		]);

		fireEvent.click(screen.getByRole("button", { name: "Clear" }));
		expect(onChange).toHaveBeenLastCalledWith([]);
	});

	it("initializes from existing slots and does not fire onChange on mount", () => {
		const onChange = vi.fn();
		render(
			<DateAvailabilityCalendar
				event={event}
				initialSelections={["2025-08-02T00:00:00.000Z"]}
				onChange={onChange}
			/>,
		);

		// Chip for the pre-selected day is shown; no spurious onChange on mount.
		expect(screen.getByText("Sat, Aug 2")).toBeTruthy();
		expect(onChange).not.toHaveBeenCalled();
	});

	it("removes a day when its chip is clicked", () => {
		const onChange = vi.fn();
		render(
			<DateAvailabilityCalendar
				event={event}
				initialSelections={["2025-08-02T00:00:00.000Z"]}
				onChange={onChange}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Remove Sat, Aug 2" }));
		expect(onChange).toHaveBeenLastCalledWith([]);
	});

	it("fires response_grid_interacted only once across multiple day toggles", () => {
		render(<DateAvailabilityCalendar event={event} onChange={vi.fn()} />);

		fireEvent.click(screen.getByRole("button", { name: "Select all" }));
		fireEvent.click(screen.getByRole("button", { name: "Clear" }));
		fireEvent.click(screen.getByRole("button", { name: "Select all" }));

		const gridInteractedCalls = vi
			.mocked(trackEvent)
			.mock.calls.filter(([name]) => name === "response_grid_interacted");
		expect(gridInteractedCalls).toHaveLength(1);
		expect(gridInteractedCalls[0][1]).toEqual({
			eventId: "event123",
			eventMode: "dates",
		});
	});
});
