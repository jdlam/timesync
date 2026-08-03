import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "@/lib/analytics-events";
import type { PublicEvent } from "../../../convex/shared_types";
import { AvailabilityGrid } from "./AvailabilityGrid";

vi.mock("@/lib/analytics-events", () => ({
	trackEvent: vi.fn(),
}));

// Two 30-min slots on a single day (UTC) so the grid renders exactly two cells.
const event = {
	_id: "event123",
	timeZone: "UTC",
	eventMode: "times",
	dates: ["2025-08-01"],
	timeRangeStart: "09:00",
	timeRangeEnd: "10:00",
	slotDuration: 30,
} as unknown as PublicEvent;

describe("AvailabilityGrid", () => {
	beforeEach(() => vi.clearAllMocks());
	afterEach(() => cleanup());

	it("fires response_grid_interacted only once across multiple slot toggles", () => {
		render(<AvailabilityGrid event={event} onChange={vi.fn()} mode="select" />);

		const buttons = screen.getAllByRole("button");
		fireEvent.mouseDown(buttons[0]);
		fireEvent.mouseDown(buttons[1]);
		fireEvent.mouseDown(buttons[0]);

		const gridInteractedCalls = vi
			.mocked(trackEvent)
			.mock.calls.filter(([name]) => name === "response_grid_interacted");
		expect(gridInteractedCalls).toHaveLength(1);
		expect(gridInteractedCalls[0][1]).toEqual({
			eventId: "event123",
			eventMode: "times",
			interactionType: "click",
		});
	});
});
