import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PublicEvent } from "../../convex/shared_types";
import { EventHeader } from "./EventHeader";

function makeEvent(overrides: Partial<PublicEvent>): PublicEvent {
	return {
		_id: "e1",
		title: "Test",
		timeZone: "UTC",
		slotDuration: 30,
		dates: ["2025-08-02", "2025-08-03"],
		maxRespondents: 5,
		...overrides,
	} as unknown as PublicEvent;
}

describe("EventHeader", () => {
	afterEach(() => cleanup());

	it("shows minute slots for time-based events", () => {
		render(<EventHeader event={makeEvent({ eventMode: "times" })} />);
		expect(screen.getByText("30 minute slots")).toBeTruthy();
	});

	it("hides minute slots and counts blocks for grouped dates events", () => {
		render(
			<EventHeader
				event={makeEvent({
					eventMode: "dates",
					datePattern: "weekends",
					patternWeekdays: [0, 6],
					dates: ["2025-08-02", "2025-08-03", "2025-08-09", "2025-08-10"],
				})}
			/>,
		);
		expect(screen.queryByText(/minute slots/)).toBeNull();
		expect(screen.getByText("2 weekends")).toBeTruthy();
	});

	it("hides minute slots for individual dates events", () => {
		render(
			<EventHeader
				event={makeEvent({ eventMode: "dates", datePattern: "individual" })}
			/>,
		);
		expect(screen.queryByText(/minute slots/)).toBeNull();
		expect(screen.queryByText(/weekend/)).toBeNull();
		expect(screen.getByText("2 days")).toBeTruthy();
	});
});
