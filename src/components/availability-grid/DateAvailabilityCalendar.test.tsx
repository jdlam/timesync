import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicEvent } from "../../../convex/shared_types";
import { DateAvailabilityCalendar } from "./DateAvailabilityCalendar";

// Minimal dates-only event (UTC so canonical slots are midnight-Z).
const event = {
	_id: "event123",
	timeZone: "UTC",
	eventMode: "dates",
	dates: ["2025-08-01", "2025-08-02", "2025-08-03"],
} as unknown as PublicEvent;

function setDateInput(id: string, value: string) {
	const input = document.getElementById(id) as HTMLInputElement;
	fireEvent.change(input, { target: { value } });
}

describe("DateAvailabilityCalendar", () => {
	afterEach(() => cleanup());

	it("emits canonical slots for a contiguous range added via inputs", () => {
		const onChange = vi.fn();
		render(<DateAvailabilityCalendar event={event} onChange={onChange} />);

		setDateInput("avail-from", "2025-08-01");
		setDateInput("avail-to", "2025-08-02");
		fireEvent.click(screen.getByRole("button", { name: "Add range" }));

		expect(onChange).toHaveBeenLastCalledWith([
			"2025-08-01T00:00:00.000Z",
			"2025-08-02T00:00:00.000Z",
		]);
	});

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

	it("initializes selection from existing slots (edit flow)", () => {
		const onChange = vi.fn();
		render(
			<DateAvailabilityCalendar
				event={event}
				initialSelections={["2025-08-02T00:00:00.000Z"]}
				onChange={onChange}
			/>,
		);

		// Summary reflects the single pre-selected day, with a chip for it.
		expect(screen.getByText("1 day selected")).toBeTruthy();
		expect(screen.getByText("Sat, Aug 2")).toBeTruthy();
	});

	it("does not fire onChange on initial mount", () => {
		const onChange = vi.fn();
		render(
			<DateAvailabilityCalendar
				event={event}
				initialSelections={["2025-08-01T00:00:00.000Z"]}
				onChange={onChange}
			/>,
		);
		expect(onChange).not.toHaveBeenCalled();
	});
});
