import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	formatDate,
	formatDateDisplay,
	formatTimeSlot,
	formatTimeSlotWithDayOffset,
	formatTimezoneOffset,
	generateTimeSlots,
	getBrowserTimezone,
	getDateColumnLabel,
	getDayOffset,
	getTimezoneOffsetDifference,
	groupSlotsByDate,
	isDateInPast,
	parseTimeInZone,
	validateTimeRange,
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
		it("should format time in short format", () => {
			// 2025-01-15T14:00:00Z is 9:00 AM EST
			const formatted = formatTimeSlot(
				"2025-01-15T14:00:00.000Z",
				"America/New_York",
				"short",
			);

			expect(formatted).toBe("9:00 AM");
		});

		it("should format time in long format", () => {
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

	describe("getDayOffset", () => {
		it("should return 0 when timezones are the same", () => {
			const offset = getDayOffset(
				"2025-01-15T14:00:00.000Z",
				"America/New_York",
				"America/New_York",
			);

			expect(offset).toBe(0);
		});

		it("should return +1 when display timezone is ahead and crosses midnight", () => {
			// 11 PM EST on Jan 15 = 4:00 UTC Jan 16 = 5 AM in London (Jan 16)
			// This is 4:00 AM UTC, which is still Jan 15 in EST but Jan 16 in London
			const offset = getDayOffset(
				"2025-01-16T04:00:00.000Z", // 11 PM EST Jan 15, 4 AM GMT Jan 16
				"America/New_York",
				"Europe/London",
			);

			expect(offset).toBe(1);
		});

		it("should return -1 when display timezone is behind and crosses midnight", () => {
			// Early morning in London can be previous day in LA
			// 2 AM London Jan 16 = 2:00 UTC Jan 16 = 6 PM PST Jan 15
			const offset = getDayOffset(
				"2025-01-16T02:00:00.000Z", // 2 AM GMT Jan 16, 6 PM PST Jan 15
				"Europe/London",
				"America/Los_Angeles",
			);

			expect(offset).toBe(-1);
		});

		it("should return 0 when times don't cross midnight", () => {
			// Noon EST = 5 PM London, same day
			const offset = getDayOffset(
				"2025-01-15T17:00:00.000Z", // Noon EST, 5 PM London
				"America/New_York",
				"Europe/London",
			);

			expect(offset).toBe(0);
		});
	});

	describe("formatTimeSlotWithDayOffset", () => {
		it("should return time without offset when timezones are similar", () => {
			const result = formatTimeSlotWithDayOffset(
				"2025-01-15T17:00:00.000Z",
				"America/New_York",
				"America/New_York",
			);

			expect(result.time).toBe("12:00 PM");
			expect(result.dayOffset).toBe(0);
			expect(result.dayLabel).toBeNull();
		});

		it("should return +1d label when crossing to next day", () => {
			// 11 PM EST = 4 AM GMT next day
			const result = formatTimeSlotWithDayOffset(
				"2025-01-16T04:00:00.000Z",
				"America/New_York",
				"Europe/London",
			);

			expect(result.time).toBe("4:00 AM");
			expect(result.dayOffset).toBe(1);
			expect(result.dayLabel).toBe("+1d");
		});

		it("should return -1d label when crossing to previous day", () => {
			// 2 AM GMT = 6 PM PST previous day
			const result = formatTimeSlotWithDayOffset(
				"2025-01-16T02:00:00.000Z",
				"Europe/London",
				"America/Los_Angeles",
			);

			expect(result.time).toBe("6:00 PM");
			expect(result.dayOffset).toBe(-1);
			expect(result.dayLabel).toBe("-1d");
		});
	});

	describe("getTimezoneOffsetDifference", () => {
		it("should return 0 for same timezone", () => {
			const diff = getTimezoneOffsetDifference(
				"America/New_York",
				"America/New_York",
			);

			expect(diff).toBe(0);
		});

		it("should return positive value when second timezone is ahead", () => {
			// London is 5 hours ahead of New York in winter
			const diff = getTimezoneOffsetDifference(
				"America/New_York",
				"Europe/London",
			);

			expect(diff).toBe(5);
		});

		it("should return negative value when second timezone is behind", () => {
			// LA is 3 hours behind New York
			const diff = getTimezoneOffsetDifference(
				"America/New_York",
				"America/Los_Angeles",
			);

			expect(diff).toBe(-3);
		});
	});

	describe("formatTimezoneOffset", () => {
		it("should format positive offset", () => {
			expect(formatTimezoneOffset(5)).toBe("+5 hours");
		});

		it("should format negative offset", () => {
			expect(formatTimezoneOffset(-3)).toBe("-3 hours");
		});

		it("should use singular 'hour' for 1", () => {
			expect(formatTimezoneOffset(1)).toBe("+1 hour");
			expect(formatTimezoneOffset(-1)).toBe("-1 hour");
		});

		it("should handle zero offset", () => {
			expect(formatTimezoneOffset(0)).toBe("+0 hours");
		});
	});
});
