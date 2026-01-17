import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
	generateTimeSlots,
	parseTimeInZone,
	formatTimeSlot,
	formatDate,
	formatDateDisplay,
	groupSlotsByDate,
	getDateColumnLabel,
	validateTimeRange,
	isDateInPast,
	getBrowserTimezone,
} from "./time-utils";

describe("time-utils", () => {
	describe("generateTimeSlots", () => {
		it("should generate slots for a single day", () => {
			const slots = generateTimeSlots(
				["2025-01-15"],
				"09:00",
				"12:00",
				60,
				"America/New_York",
			);

			expect(slots).toHaveLength(3); // 9:00, 10:00, 11:00
		});

		it("should generate slots with 30-minute intervals", () => {
			const slots = generateTimeSlots(
				["2025-01-15"],
				"09:00",
				"11:00",
				30,
				"America/New_York",
			);

			expect(slots).toHaveLength(4); // 9:00, 9:30, 10:00, 10:30
		});

		it("should generate slots for multiple days", () => {
			const slots = generateTimeSlots(
				["2025-01-15", "2025-01-16"],
				"09:00",
				"10:00",
				30,
				"America/New_York",
			);

			expect(slots).toHaveLength(4); // 2 slots per day * 2 days
		});

		it("should return empty array when start equals end", () => {
			const slots = generateTimeSlots(
				["2025-01-15"],
				"09:00",
				"09:00",
				30,
				"America/New_York",
			);

			expect(slots).toHaveLength(0);
		});

		it("should return ISO strings in UTC", () => {
			const slots = generateTimeSlots(
				["2025-01-15"],
				"09:00",
				"10:00",
				60,
				"America/New_York",
			);

			expect(slots[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
		});
	});

	describe("parseTimeInZone", () => {
		it("should parse time in Eastern timezone", () => {
			const date = parseTimeInZone("2025-01-15", "09:00", "America/New_York");

			// 9:00 AM EST is 14:00 UTC (EST is UTC-5)
			expect(date.getUTCHours()).toBe(14);
			expect(date.getUTCMinutes()).toBe(0);
		});

		it("should parse time in Pacific timezone", () => {
			const date = parseTimeInZone(
				"2025-01-15",
				"09:00",
				"America/Los_Angeles",
			);

			// 9:00 AM PST is 17:00 UTC (PST is UTC-8)
			expect(date.getUTCHours()).toBe(17);
			expect(date.getUTCMinutes()).toBe(0);
		});

		it("should handle DST transitions", () => {
			// July is PDT (UTC-7), not PST (UTC-8)
			const date = parseTimeInZone(
				"2025-07-15",
				"09:00",
				"America/Los_Angeles",
			);

			// 9:00 AM PDT is 16:00 UTC
			expect(date.getUTCHours()).toBe(16);
		});
	});

	describe("formatTimeSlot", () => {
		it('should format time in short format', () => {
			// 2025-01-15T14:00:00Z is 9:00 AM EST
			const formatted = formatTimeSlot(
				"2025-01-15T14:00:00.000Z",
				"America/New_York",
				"short",
			);

			expect(formatted).toBe("9:00 AM");
		});

		it('should format time in long format', () => {
			const formatted = formatTimeSlot(
				"2025-01-15T14:00:00.000Z",
				"America/New_York",
				"long",
			);

			expect(formatted).toMatch(/Wed, Jan 15, 9:00 AM/);
		});

		it("should default to short format", () => {
			const formatted = formatTimeSlot(
				"2025-01-15T14:00:00.000Z",
				"America/New_York",
			);

			expect(formatted).toBe("9:00 AM");
		});
	});

	describe("formatDate", () => {
		it("should format ISO timestamp to date string", () => {
			const formatted = formatDate(
				"2025-01-15T14:00:00.000Z",
				"America/New_York",
			);

			expect(formatted).toBe("2025-01-15");
		});

		it("should handle timezone boundaries", () => {
			// 2025-01-15T03:00:00Z is still Jan 14 in PST
			const formatted = formatDate(
				"2025-01-15T03:00:00.000Z",
				"America/Los_Angeles",
			);

			expect(formatted).toBe("2025-01-14");
		});
	});

	describe("formatDateDisplay", () => {
		it("should format date for display", () => {
			const formatted = formatDateDisplay("2025-01-15");

			expect(formatted).toBe("Wed, Jan 15");
		});
	});

	describe("groupSlotsByDate", () => {
		it("should group slots by date", () => {
			const slots = [
				"2025-01-15T14:00:00.000Z",
				"2025-01-15T15:00:00.000Z",
				"2025-01-16T14:00:00.000Z",
			];

			const grouped = groupSlotsByDate(slots, "America/New_York");

			expect(grouped.size).toBe(2);
			expect(grouped.get("2025-01-15")).toHaveLength(2);
			expect(grouped.get("2025-01-16")).toHaveLength(1);
		});

		it("should return empty map for empty slots", () => {
			const grouped = groupSlotsByDate([], "America/New_York");

			expect(grouped.size).toBe(0);
		});
	});

	describe("getDateColumnLabel", () => {
		it("should return formatted column label", () => {
			const label = getDateColumnLabel("2025-01-15");

			expect(label).toBe("Wed 1/15");
		});
	});

	describe("validateTimeRange", () => {
		it("should return true when end is after start", () => {
			expect(validateTimeRange("09:00", "17:00")).toBe(true);
		});

		it("should return false when end is before start", () => {
			expect(validateTimeRange("17:00", "09:00")).toBe(false);
		});

		it("should return false when times are equal", () => {
			expect(validateTimeRange("09:00", "09:00")).toBe(false);
		});
	});

	describe("isDateInPast", () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should return true for past dates", () => {
			expect(isDateInPast("2025-01-14")).toBe(true);
		});

		it("should return false for today", () => {
			expect(isDateInPast("2025-01-15")).toBe(false);
		});

		it("should return false for future dates", () => {
			expect(isDateInPast("2025-01-16")).toBe(false);
		});
	});

	describe("getBrowserTimezone", () => {
		it("should return a valid timezone string", () => {
			const tz = getBrowserTimezone();

			expect(typeof tz).toBe("string");
			expect(tz.length).toBeGreaterThan(0);
		});
	});
});
