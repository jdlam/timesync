import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicEvent } from "../../../convex/shared_types";
import { DateBlockSelector } from "./DateBlockSelector";

// Grouped weekends event (UTC → canonical slots are midnight-Z).
const event = {
	_id: "event123",
	timeZone: "UTC",
	eventMode: "dates",
	datePattern: "weekends",
	patternWeekdays: [0, 6],
	dates: ["2025-08-02", "2025-08-03", "2025-08-09", "2025-08-10"],
} as unknown as PublicEvent;

describe("DateBlockSelector", () => {
	afterEach(() => cleanup());

	it("toggling a block emits slots for all of its days", () => {
		const onChange = vi.fn();
		render(<DateBlockSelector event={event} onChange={onChange} />);

		fireEvent.click(
			screen.getByRole("button", { name: /Sat, Aug 2 – Sun, Aug 3/ }),
		);
		expect(onChange).toHaveBeenLastCalledWith([
			"2025-08-02T00:00:00.000Z",
			"2025-08-03T00:00:00.000Z",
		]);
	});

	it("select all emits every block's days; clear empties", () => {
		const onChange = vi.fn();
		render(<DateBlockSelector event={event} onChange={onChange} />);

		fireEvent.click(screen.getByRole("button", { name: "Select all" }));
		expect(onChange).toHaveBeenLastCalledWith([
			"2025-08-02T00:00:00.000Z",
			"2025-08-03T00:00:00.000Z",
			"2025-08-09T00:00:00.000Z",
			"2025-08-10T00:00:00.000Z",
		]);

		fireEvent.click(screen.getByRole("button", { name: "Clear" }));
		expect(onChange).toHaveBeenLastCalledWith([]);
	});

	it("seeds selected blocks from existing slots without firing onChange", () => {
		const onChange = vi.fn();
		render(
			<DateBlockSelector
				event={event}
				initialSelections={[
					"2025-08-09T00:00:00.000Z",
					"2025-08-10T00:00:00.000Z",
				]}
				onChange={onChange}
			/>,
		);
		expect(onChange).not.toHaveBeenCalled();
		expect(
			screen
				.getByRole("button", { name: /Sat, Aug 9 – Sun, Aug 10/ })
				.getAttribute("aria-pressed"),
		).toBe("true");
	});
});
