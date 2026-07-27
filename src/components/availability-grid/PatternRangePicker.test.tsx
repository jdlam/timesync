import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PatternRangePicker } from "./PatternRangePicker";

describe("PatternRangePicker", () => {
	afterEach(() => cleanup());

	it("renders one removable chip per block", () => {
		render(
			<PatternRangePicker
				weekdays={[0, 6]}
				selected={["2025-08-02", "2025-08-03", "2025-08-09", "2025-08-10"]}
				onSelectedChange={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("button", { name: /Remove Sat, Aug 2 – Sun, Aug 3/ }),
		).toBeTruthy();
		expect(
			screen.getByRole("button", { name: /Remove Sat, Aug 9 – Sun, Aug 10/ }),
		).toBeTruthy();
	});

	it("removing a block drops all of its days", () => {
		const onSelectedChange = vi.fn();
		render(
			<PatternRangePicker
				weekdays={[0, 6]}
				selected={["2025-08-02", "2025-08-03", "2025-08-09", "2025-08-10"]}
				onSelectedChange={onSelectedChange}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: /Remove Sat, Aug 2 – Sun, Aug 3/ }),
		);
		expect(onSelectedChange).toHaveBeenCalledWith(["2025-08-09", "2025-08-10"]);
	});
});
