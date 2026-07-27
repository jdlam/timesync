import { parse } from "date-fns";
import { describe, expect, it } from "vitest";
import { datesInRangeMatchingWeekdays } from "./DayPoolPicker";

const d = (s: string) => parse(s, "yyyy-MM-dd", new Date());
const WEEKEND = new Set([0, 6]); // Sun, Sat
const FRIDAYS = new Set([5]);
const ALL = new Set([0, 1, 2, 3, 4, 5, 6]);

describe("datesInRangeMatchingWeekdays", () => {
	it("returns only weekend days across a range", () => {
		// Aug 1 2025 is a Friday.
		expect(
			datesInRangeMatchingWeekdays(d("2025-08-01"), d("2025-08-14"), WEEKEND),
		).toEqual(["2025-08-02", "2025-08-03", "2025-08-09", "2025-08-10"]);
	});

	it("returns every matching single weekday across a range", () => {
		expect(
			datesInRangeMatchingWeekdays(d("2025-08-01"), d("2025-08-31"), FRIDAYS),
		).toEqual([
			"2025-08-01",
			"2025-08-08",
			"2025-08-15",
			"2025-08-22",
			"2025-08-29",
		]);
	});

	it("returns every day when all weekdays are included", () => {
		expect(
			datesInRangeMatchingWeekdays(d("2025-08-01"), d("2025-08-03"), ALL),
		).toEqual(["2025-08-01", "2025-08-02", "2025-08-03"]);
	});

	it("returns an empty array when the range is inverted", () => {
		expect(
			datesInRangeMatchingWeekdays(d("2025-08-10"), d("2025-08-01"), ALL),
		).toEqual([]);
	});
});
