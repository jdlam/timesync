import { describe, expect, it } from "vitest";
import {
	calculateHeatmap,
	calculateHeatmapStats,
	type DayAvailability,
	getBestBlocks,
	getBestConsecutiveRun,
	getBestTimeSlots,
	getHeatmapColor,
	getHeatmapOpacity,
	type HeatmapSlotData,
} from "./heatmap-utils";

// Build a DayAvailability entry from a date and available count.
function day(date: string, count: number, total = count): DayAvailability {
	return {
		date,
		data: {
			count,
			percentage: total === 0 ? 0 : (count / total) * 100,
			respondents: [],
		},
	};
}

// Mock response type matching what calculateHeatmap expects
interface MockResponse {
	respondentName: string;
	selectedSlots: string[];
}

// Helper to create mock responses
function createMockResponse(
	name: string,
	selectedSlots: string[],
): MockResponse {
	return {
		respondentName: name,
		selectedSlots,
	};
}

describe("heatmap-utils", () => {
	describe("calculateHeatmap", () => {
		const allSlots = ["2025-01-15T14:00:00.000Z", "2025-01-15T15:00:00.000Z"];

		it("should return empty data when no responses", () => {
			const heatmap = calculateHeatmap([], allSlots);

			expect(heatmap.size).toBe(2);
			expect(heatmap.get(allSlots[0])).toEqual({
				count: 0,
				percentage: 0,
				respondents: [],
			});
		});

		it("should calculate percentage correctly", () => {
			const responses = [
				createMockResponse("Alice", [allSlots[0]]),
				createMockResponse("Bob", [allSlots[0], allSlots[1]]),
			] as MockResponse[];

			const heatmap = calculateHeatmap(responses, allSlots);

			// Slot 0: Alice + Bob = 100%
			expect(heatmap.get(allSlots[0])?.percentage).toBe(100);
			// Slot 1: Bob only = 50%
			expect(heatmap.get(allSlots[1])?.percentage).toBe(50);
		});

		it("should track respondent names", () => {
			const responses = [
				createMockResponse("Alice", [allSlots[0]]),
				createMockResponse("Bob", [allSlots[0], allSlots[1]]),
			] as MockResponse[];

			const heatmap = calculateHeatmap(responses, allSlots);

			expect(heatmap.get(allSlots[0])?.respondents).toEqual(["Alice", "Bob"]);
			expect(heatmap.get(allSlots[1])?.respondents).toEqual(["Bob"]);
		});

		it("should handle slots with no availability", () => {
			const responses = [
				createMockResponse("Alice", [allSlots[0]]),
			] as MockResponse[];

			const heatmap = calculateHeatmap(responses, allSlots);

			expect(heatmap.get(allSlots[1])).toEqual({
				count: 0,
				percentage: 0,
				respondents: [],
			});
		});
	});

	describe("getHeatmapColor", () => {
		it("should return gray for 0%", () => {
			const darkColor = getHeatmapColor(0, true);
			const lightColor = getHeatmapColor(0, false);

			expect(darkColor).toContain("oklch(0.30");
			expect(lightColor).toContain("oklch(0.85");
		});

		it("should return red for very low availability (1-20%)", () => {
			const color = getHeatmapColor(10);

			expect(color).toContain("oklch(0.55");
		});

		it("should return orange for low availability (21-40%)", () => {
			const color = getHeatmapColor(30);

			expect(color).toContain("oklch(0.65");
		});

		it("should return yellow for medium availability (41-60%)", () => {
			const color = getHeatmapColor(50);

			expect(color).toContain("oklch(0.75");
		});

		it("should return light green for good availability (61-80%)", () => {
			const color = getHeatmapColor(70);

			expect(color).toContain("oklch(0.70");
		});

		it("should return teal/green for high availability (81-100%)", () => {
			const color = getHeatmapColor(100);

			expect(color).toContain("oklch(0.65 0.20 180)");
		});

		it("should use custom color when provided for high availability", () => {
			const color = getHeatmapColor(100, true, {
				primary: "oklch(0.7 0.3 200)",
			});

			expect(color).toBe("oklch(0.7 0.3 200)");
		});
	});

	describe("getHeatmapOpacity", () => {
		it("should return 0 for 0%", () => {
			expect(getHeatmapOpacity(0)).toBe(0);
		});

		it("should return 0.5 for 50%", () => {
			expect(getHeatmapOpacity(50)).toBe(0.5);
		});

		it("should return 1 for 100%", () => {
			expect(getHeatmapOpacity(100)).toBe(1);
		});

		it("should cap at 1 for values over 100%", () => {
			expect(getHeatmapOpacity(150)).toBe(1);
		});
	});

	describe("getBestTimeSlots", () => {
		it("should return top N slots by availability", () => {
			const heatmap = new Map<string, HeatmapSlotData>([
				["slot1", { count: 3, percentage: 100, respondents: [] }],
				["slot2", { count: 2, percentage: 66, respondents: [] }],
				["slot3", { count: 1, percentage: 33, respondents: [] }],
			]);

			const best = getBestTimeSlots(heatmap, 2);

			expect(best).toHaveLength(2);
			expect(best[0][0]).toBe("slot1");
			expect(best[1][0]).toBe("slot2");
		});

		it("should default to top 5", () => {
			const heatmap = new Map<string, HeatmapSlotData>();
			for (let i = 0; i < 10; i++) {
				heatmap.set(`slot${i}`, {
					count: 10 - i,
					percentage: (10 - i) * 10,
					respondents: [],
				});
			}

			const best = getBestTimeSlots(heatmap);

			expect(best).toHaveLength(5);
		});

		it("should sort by count when percentages are equal", () => {
			const heatmap = new Map<string, HeatmapSlotData>([
				["slot1", { count: 2, percentage: 50, respondents: [] }],
				["slot2", { count: 3, percentage: 50, respondents: [] }],
			]);

			const best = getBestTimeSlots(heatmap, 2);

			expect(best[0][0]).toBe("slot2"); // Higher count
		});
	});

	describe("calculateHeatmapStats", () => {
		it("should return zeros for empty data", () => {
			const heatmap = new Map<string, HeatmapSlotData>();

			const stats = calculateHeatmapStats(heatmap);

			expect(stats).toEqual({
				averageAvailability: 0,
				maxAvailability: 0,
				minAvailability: 0,
				totalSlots: 0,
			});
		});

		it("should calculate correct statistics", () => {
			const heatmap = new Map<string, HeatmapSlotData>([
				["slot1", { count: 3, percentage: 100, respondents: [] }],
				["slot2", { count: 1, percentage: 33, respondents: [] }],
				["slot3", { count: 0, percentage: 0, respondents: [] }],
			]);

			const stats = calculateHeatmapStats(heatmap);

			expect(stats.totalSlots).toBe(3);
			expect(stats.maxAvailability).toBe(100);
			expect(stats.minAvailability).toBe(0);
			expect(stats.averageAvailability).toBeCloseTo(44.33, 1);
		});
	});

	describe("getBestConsecutiveRun", () => {
		it("should return null when there are no days", () => {
			expect(getBestConsecutiveRun([])).toBeNull();
		});

		it("should return a single day as a length-1 run", () => {
			const run = getBestConsecutiveRun([day("2025-08-01", 3)]);
			expect(run).toMatchObject({
				startDate: "2025-08-01",
				endDate: "2025-08-01",
				length: 1,
				minCount: 3,
			});
		});

		it("should pick the longest run when overlap is uniform", () => {
			const run = getBestConsecutiveRun([
				day("2025-08-01", 4),
				day("2025-08-02", 4),
				day("2025-08-03", 4),
				day("2025-08-04", 4),
				day("2025-08-05", 4),
			]);
			expect(run).toMatchObject({
				startDate: "2025-08-01",
				endDate: "2025-08-05",
				length: 5,
				minCount: 4,
			});
		});

		it("should prefer higher shared overlap over a longer weaker run", () => {
			// Day 1 has only 2 free; days 2-3 have 5 free each.
			const run = getBestConsecutiveRun([
				day("2025-08-01", 2, 5),
				day("2025-08-02", 5, 5),
				day("2025-08-03", 5, 5),
			]);
			expect(run).toMatchObject({
				startDate: "2025-08-02",
				endDate: "2025-08-03",
				length: 2,
				minCount: 5,
			});
		});

		it("should not extend a run across a calendar gap", () => {
			// 08-03 is missing, so 08-01..08-02 and 08-04 are separate runs.
			const run = getBestConsecutiveRun([
				day("2025-08-01", 3),
				day("2025-08-02", 3),
				day("2025-08-04", 5),
			]);
			// The isolated 08-04 has the highest shared overlap (5).
			expect(run).toMatchObject({
				startDate: "2025-08-04",
				endDate: "2025-08-04",
				minCount: 5,
			});
		});
	});

	describe("getBestBlocks", () => {
		const blocks = [
			["2025-08-02", "2025-08-03"],
			["2025-08-09", "2025-08-10"],
		];

		it("counts only respondents available for the WHOLE block", () => {
			const respondents = [
				new Set(["2025-08-02", "2025-08-03", "2025-08-09", "2025-08-10"]), // both
				new Set(["2025-08-02", "2025-08-03"]), // first only
				new Set(["2025-08-09"]), // partial second — does not count
			];
			const result = getBestBlocks(blocks, respondents, 3);
			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({
				block: ["2025-08-02", "2025-08-03"],
				count: 2,
			});
			expect(result[1]).toMatchObject({
				block: ["2025-08-09", "2025-08-10"],
				count: 1,
			});
			expect(result[0].percentage).toBeCloseTo((2 / 3) * 100, 5);
		});

		it("returns zero counts when there are no responses", () => {
			const result = getBestBlocks(blocks, [], 3);
			expect(result.every((b) => b.count === 0 && b.percentage === 0)).toBe(
				true,
			);
		});
	});
});
