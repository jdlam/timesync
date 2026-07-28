import { describe, expect, it } from "vitest";
import {
	formatBlockLabel,
	getDateBlocks,
	isGroupedPattern,
	patternLabel,
	weekdaysForPattern,
} from "./date-blocks";

describe("date-blocks", () => {
	describe("getDateBlocks", () => {
		it("splits weekends into Sat–Sun pairs", () => {
			expect(
				getDateBlocks(["2025-08-02", "2025-08-03", "2025-08-09", "2025-08-10"]),
			).toEqual([
				["2025-08-02", "2025-08-03"],
				["2025-08-09", "2025-08-10"],
			]);
		});

		it("keeps a contiguous work-week as one block", () => {
			expect(
				getDateBlocks([
					"2025-08-04",
					"2025-08-05",
					"2025-08-06",
					"2025-08-07",
					"2025-08-08",
				]),
			).toEqual([
				["2025-08-04", "2025-08-05", "2025-08-06", "2025-08-07", "2025-08-08"],
			]);
		});

		it("sorts and dedupes unsorted input", () => {
			expect(getDateBlocks(["2025-08-03", "2025-08-02", "2025-08-02"])).toEqual(
				[["2025-08-02", "2025-08-03"]],
			);
		});

		it("returns an empty array for no dates", () => {
			expect(getDateBlocks([])).toEqual([]);
		});
	});

	describe("formatBlockLabel", () => {
		it("labels a single day", () => {
			expect(formatBlockLabel(["2025-08-01"])).toBe("Fri, Aug 1");
		});
		it("labels a run as first – last", () => {
			expect(formatBlockLabel(["2025-08-02", "2025-08-03"])).toBe(
				"Sat, Aug 2 – Sun, Aug 3",
			);
		});
	});

	describe("weekdaysForPattern", () => {
		it("maps presets and custom", () => {
			expect(weekdaysForPattern("weekends")).toEqual([0, 6]);
			expect(weekdaysForPattern("weekdays")).toEqual([1, 2, 3, 4, 5]);
			expect(weekdaysForPattern("custom", [3, 1])).toEqual([1, 3]);
			expect(weekdaysForPattern("individual")).toEqual([]);
		});
	});

	describe("patternLabel", () => {
		it("labels each pattern", () => {
			expect(patternLabel("weekends")).toBe("Every weekend");
			expect(patternLabel("weekdays")).toBe("Weekdays");
			expect(patternLabel("custom", [1, 2, 3])).toBe("Every Mon, Tue, Wed");
			expect(patternLabel("individual")).toBe("Individual days");
		});
	});

	describe("isGroupedPattern", () => {
		it("is true only for recurring patterns", () => {
			expect(isGroupedPattern("weekends")).toBe(true);
			expect(isGroupedPattern("custom")).toBe(true);
			expect(isGroupedPattern("individual")).toBe(false);
			expect(isGroupedPattern(undefined)).toBe(false);
		});
	});
});
