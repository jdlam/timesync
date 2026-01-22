import { addMinutes, format, parse } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * Generate all time slots between start/end times for given dates
 * @param dates - Array of date strings in 'YYYY-MM-DD' format
 * @param timeRangeStart - Start time in 'HH:mm' format (e.g., '09:00')
 * @param timeRangeEnd - End time in 'HH:mm' format (e.g., '17:00')
 * @param slotDuration - Duration in minutes (e.g., 30)
 * @param timeZone - IANA timezone string (e.g., 'America/New_York')
 * @returns Array of ISO timestamp strings
 */
export function generateTimeSlots(
	dates: string[],
	timeRangeStart: string,
	timeRangeEnd: string,
	slotDuration: number,
	timeZone: string,
): string[] {
	const slots: string[] = [];

	for (const dateStr of dates) {
		// Parse the date and times in the specified timezone
		const startDateTime = parseTimeInZone(dateStr, timeRangeStart, timeZone);
		const endDateTime = parseTimeInZone(dateStr, timeRangeEnd, timeZone);

		let currentSlot = startDateTime;

		// Generate slots from start to end
		while (currentSlot < endDateTime) {
			// Convert to UTC ISO string for storage
			slots.push(currentSlot.toISOString());
			currentSlot = addMinutes(currentSlot, slotDuration);
		}
	}

	return slots;
}

/**
 * Parse a time string in a specific timezone
 * @param dateStr - Date string in 'YYYY-MM-DD' format
 * @param timeStr - Time string in 'HH:mm' format
 * @param timeZone - IANA timezone string
 * @returns Date object
 */
export function parseTimeInZone(
	dateStr: string,
	timeStr: string,
	timeZone: string,
): Date {
	// Combine date and time strings
	const dateTimeStr = `${dateStr} ${timeStr}`;

	// Parse as if it's in the specified timezone
	const parsedDate = parse(dateTimeStr, "yyyy-MM-dd HH:mm", new Date());

	// Convert from the specified timezone to UTC
	return fromZonedTime(parsedDate, timeZone);
}

/**
 * Format ISO timestamp to display format in specific timezone
 * @param isoTimestamp - ISO 8601 timestamp string
 * @param timeZone - IANA timezone string
 * @param formatType - 'short' (9:00 AM) or 'long' (Mon, Jan 15, 9:00 AM)
 * @returns Formatted time string
 */
export function formatTimeSlot(
	isoTimestamp: string,
	timeZone: string,
	formatType: "short" | "long" = "short",
): string {
	const date = new Date(isoTimestamp);
	const zonedDate = toZonedTime(date, timeZone);

	if (formatType === "short") {
		return format(zonedDate, "h:mm a"); // 9:00 AM
	} else {
		return format(zonedDate, "EEE, MMM d, h:mm a"); // Mon, Jan 15, 9:00 AM
	}
}

/**
 * Format ISO timestamp to just the date in specific timezone
 * @param isoTimestamp - ISO 8601 timestamp string
 * @param timeZone - IANA timezone string
 * @returns Formatted date string
 */
export function formatDate(isoTimestamp: string, timeZone: string): string {
	const date = new Date(isoTimestamp);
	const zonedDate = toZonedTime(date, timeZone);
	return format(zonedDate, "yyyy-MM-dd"); // 2025-01-15
}

/**
 * Format date string for display
 * @param dateStr - Date string in 'YYYY-MM-DD' format
 * @returns Formatted date string (e.g., "Mon, Jan 15")
 */
export function formatDateDisplay(dateStr: string): string {
	const date = parse(dateStr, "yyyy-MM-dd", new Date());
	return format(date, "EEE, MMM d"); // Mon, Jan 15
}

/**
 * Group time slots by date
 * @param slots - Array of ISO timestamp strings
 * @param timeZone - IANA timezone string
 * @returns Map of date string to array of slot timestamps
 */
export function groupSlotsByDate(
	slots: string[],
	timeZone: string,
): Map<string, string[]> {
	const grouped = new Map<string, string[]>();

	for (const slot of slots) {
		const dateKey = formatDate(slot, timeZone);

		if (!grouped.has(dateKey)) {
			grouped.set(dateKey, []);
		}

		grouped.get(dateKey)?.push(slot);
	}

	return grouped;
}

/**
 * Get display label for a date column
 * @param dateStr - Date string in 'YYYY-MM-DD' format
 * @returns Display label (e.g., "Mon 1/15")
 */
export function getDateColumnLabel(dateStr: string): string {
	const date = parse(dateStr, "yyyy-MM-dd", new Date());
	return format(date, "EEE M/d"); // Mon 1/15
}

/**
 * Validate that end time is after start time
 * @param startTime - Start time in 'HH:mm' format
 * @param endTime - End time in 'HH:mm' format
 * @returns true if valid, false otherwise
 */
export function validateTimeRange(startTime: string, endTime: string): boolean {
	const start = parse(startTime, "HH:mm", new Date());
	const end = parse(endTime, "HH:mm", new Date());
	return end > start;
}

/**
 * Check if a date is in the past
 * @param dateStr - Date string in 'YYYY-MM-DD' format
 * @returns true if date is in the past
 */
export function isDateInPast(dateStr: string): boolean {
	const date = parse(dateStr, "yyyy-MM-dd", new Date());
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return date < today;
}

/**
 * Get the current timezone of the user's browser
 * @returns IANA timezone string
 */
export function getBrowserTimezone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get the day offset when displaying a timestamp in a different timezone
 * @param isoTimestamp - ISO 8601 timestamp string
 * @param eventTimezone - The event's IANA timezone string
 * @param displayTimezone - The display IANA timezone string
 * @returns Day offset (-1, 0, +1, etc.) relative to event timezone date
 */
export function getDayOffset(
	isoTimestamp: string,
	eventTimezone: string,
	displayTimezone: string,
): number {
	const date = new Date(isoTimestamp);
	const eventDate = toZonedTime(date, eventTimezone);
	const displayDate = toZonedTime(date, displayTimezone);

	// Get just the date part (midnight of that day) for both
	const eventDayStart = new Date(eventDate);
	eventDayStart.setHours(0, 0, 0, 0);

	const displayDayStart = new Date(displayDate);
	displayDayStart.setHours(0, 0, 0, 0);

	// Calculate difference in days
	const diffMs = displayDayStart.getTime() - eventDayStart.getTime();
	const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

	return diffDays;
}

/**
 * Format time slot with day offset indicator
 * @param isoTimestamp - ISO 8601 timestamp string
 * @param eventTimezone - The event's IANA timezone string
 * @param displayTimezone - The display IANA timezone string
 * @returns Object with time, dayOffset, and optional dayLabel
 */
export function formatTimeSlotWithDayOffset(
	isoTimestamp: string,
	eventTimezone: string,
	displayTimezone: string,
): { time: string; dayOffset: number; dayLabel: string | null } {
	const date = new Date(isoTimestamp);
	const displayDate = toZonedTime(date, displayTimezone);

	const time = format(displayDate, "h:mm a");
	const dayOffset = getDayOffset(isoTimestamp, eventTimezone, displayTimezone);

	let dayLabel: string | null = null;
	if (dayOffset !== 0) {
		// For offsets of +/- 1, show simple indicator, otherwise show date
		if (dayOffset === 1) {
			dayLabel = "+1d";
		} else if (dayOffset === -1) {
			dayLabel = "-1d";
		} else {
			dayLabel = format(displayDate, "MMM d");
		}
	}

	return { time, dayOffset, dayLabel };
}

/**
 * Get the offset difference between two timezones in hours
 * @param timezone1 - First IANA timezone string
 * @param timezone2 - Second IANA timezone string
 * @returns Offset difference in hours (positive means timezone2 is ahead)
 */
export function getTimezoneOffsetDifference(
	timezone1: string,
	timezone2: string,
): number {
	// Use current time to calculate offset
	const now = new Date();

	// Get the offset for each timezone in minutes
	const offset1 = getTimezoneOffset(timezone1, now);
	const offset2 = getTimezoneOffset(timezone2, now);

	// Return difference in hours (offset is in minutes)
	// Positive means timezone2 is ahead of timezone1
	return (offset2 - offset1) / 60;
}

/**
 * Get the UTC offset for a timezone at a specific time in minutes
 * @param timezone - IANA timezone string
 * @param date - Date to check offset for
 * @returns Offset in minutes from UTC
 */
function getTimezoneOffset(timezone: string, date: Date): number {
	// Create a date string in the target timezone
	const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
	const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));

	// Return difference in minutes
	return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
}

/**
 * Format timezone offset as a human-readable string
 * @param offsetHours - Offset in hours
 * @returns Formatted string like "+5 hours" or "-3 hours"
 */
export function formatTimezoneOffset(offsetHours: number): string {
	const absOffset = Math.abs(offsetHours);
	const sign = offsetHours >= 0 ? "+" : "-";
	const unit = absOffset === 1 ? "hour" : "hours";
	return `${sign}${absOffset} ${unit}`;
}
